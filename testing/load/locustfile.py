import os
import random
import re
from urllib.parse import urlencode

from locust import HttpUser, between, task

APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")
SUPABASE_REST_URL = os.environ.get("SUPABASE_REST_URL", "").strip()
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
TEST_USER_ID = os.environ.get("TEST_USER_ID", "ae177d76-9f35-44ac-a662-1b1e4146dbe4")

# Rutas SPA representativas. El backend devuelve index.html para cualquier ruta de app.
SPA_ROUTES = [
    "/",
    "/dashboard",
    "/profile",
    "/admin",
    "/daily-orders",
    "/monthly",
    "/tendencias",
    "/cafeteria",
]

# Archivos públicos típicos que debería servir la app.
PUBLIC_FILES = [
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
]

ASSET_PATTERN = re.compile(r"""(?:src|href)=["'](/assets/[^"']+)["']""")


def supabase_headers():
    if not SUPABASE_REST_URL or not SUPABASE_ANON_KEY:
        return None
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Accept": "application/json",
        "Prefer": "count=none",
    }


def random_range_header(page_size=50, max_pages=4):
    page = random.randint(0, max_pages)
    start = page * page_size
    end = start + page_size - 1
    return f"{start}-{end}"


class FrontendUser(HttpUser):
    """
    Tráfico base de frontend:
    - Carga de HTML + assets de build
    - Navegación SPA
    - Health check y archivos públicos
    """

    host = APP_BASE_URL
    wait_time = between(0.5, 2.5)
    weight = 3

    def on_start(self):
        self.assets = []
        with self.client.get("/", name="WEB GET /", catch_response=True) as resp:
            if resp.status_code >= 400:
                resp.failure(f"home returned {resp.status_code}")
                return

            found = ASSET_PATTERN.findall(resp.text or "")
            unique_assets = []
            seen = set()
            for asset in found:
                if asset not in seen:
                    unique_assets.append(asset)
                    seen.add(asset)
            self.assets = unique_assets[:20]
            resp.success()

    @task(30)
    def landing_and_assets(self):
        self.client.get("/", name="WEB GET /")
        if not self.assets:
            return
        sample_size = min(len(self.assets), random.randint(1, 4))
        for asset in random.sample(self.assets, k=sample_size):
            self.client.get(asset, name="WEB GET /assets/[chunk]")

    @task(25)
    def navigate_spa_routes(self):
        path = random.choice(SPA_ROUTES)
        self.client.get(path, name="WEB GET /[spa-route]")

    @task(20)
    def health_check(self):
        with self.client.get("/health", name="API GET /health", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"health returned {resp.status_code}")

    @task(15)
    def public_files(self):
        path = random.choice(PUBLIC_FILES)
        self.client.get(path, name="WEB GET /[public-file]")

    @task(10)
    def missing_file_404(self):
        with self.client.get(
            "/this-file-does-not-exist.txt",
            name="WEB GET missing static",
            catch_response=True,
        ) as resp:
            if resp.status_code == 404:
                resp.success()
            else:
                resp.failure(f"missing file expected 404, got {resp.status_code}")


class SupabaseReadUser(HttpUser):
    """
    Tráfico de lectura sobre tablas clave de negocio.
    Solo se habilita si están configuradas variables de Supabase.
    """

    host = APP_BASE_URL
    wait_time = between(0.75, 3)
    weight = 2
    abstract = not bool(SUPABASE_REST_URL and SUPABASE_ANON_KEY)

    def on_start(self):
        self.sb_headers = supabase_headers()

    def supabase_get(self, path, name, range_header=None):
        if not SUPABASE_REST_URL or not self.sb_headers:
            return

        url = SUPABASE_REST_URL.rstrip("/") + path
        headers = dict(self.sb_headers)
        if range_header:
            headers["Range"] = range_header

        with self.client.get(url, headers=headers, name=name, catch_response=True) as resp:
            if resp.status_code in (401, 403):
                resp.failure(f"{name} unauthorized {resp.status_code}")
            elif resp.status_code >= 400:
                resp.failure(f"{name} unexpected {resp.status_code}")
            else:
                resp.success()

    @task(40)
    def menu_and_options(self):
        menu_params = {
            "select": "id,name,description,created_at",
            "order": "created_at.desc",
        }
        menu_path = "/menu_items?" + urlencode(menu_params, safe=",*=")
        self.supabase_get(menu_path, name="SB GET menu_items")

        options_params = {
            "select": "*",
            "order": "order_position.asc",
        }
        options_path = "/custom_options?" + urlencode(options_params, safe=",*=")
        self.supabase_get(options_path, name="SB GET custom_options")

    @task(30)
    def orders_by_user(self):
        params = {
            "select": "*",
            "order": "created_at.desc",
            "user_id": f"eq.{TEST_USER_ID}",
        }
        range_header = random_range_header()
        path = "/orders?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET orders by user", range_header=range_header)

    @task(20)
    def users_admin_list(self):
        params = {
            "select": "id,email,full_name,role,created_at",
            "order": "created_at.desc",
        }
        range_header = random_range_header()
        path = "/users?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET users paginated", range_header=range_header)

    @task(10)
    def archived_orders_ids(self):
        params = {
            "select": "id",
            "status": "eq.archived",
        }
        range_header = random_range_header()
        path = "/orders?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET orders archived ids", range_header=range_header)
