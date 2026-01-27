from locust import HttpUser, task, between
import os
import random
from urllib.parse import urlencode

APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://food-order-app-3avy.onrender.com")
SUPABASE_REST_URL = os.environ.get("SUPABASE_REST_URL")  # ej: https://xxxx.supabase.co/rest/v1
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
TEST_USER_ID = os.environ.get("TEST_USER_ID", "ae177d76-9f35-44ac-a662-1b1e4146dbe4")

# Assets representativos del build actual (actualiza hashes tras cada release).
ASSETS = [
    "/assets/AdminPanel-aP81Zvhg.js",
    "/assets/Profile-PTXI4aGy.js",
    "/assets/Imageservifood%20logo-DO8gzfSS.jpg",
]


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
    """
    Devuelve un rango tipo '0-49', '50-99', etc. para simular scroll/paginación.
    max_pages es inclusivo, con page 0..max_pages.
    """
    page = random.randint(0, max_pages)
    start = page * page_size
    end = start + page_size - 1
    return f"{start}-{end}"


class AppReadOnlyUser(HttpUser):
    """
    Recorrido 'real' solo lectura:
    - Solo GET (sin inserts/updates)
    - Supabase via anon key
    - Sin user_id hardcodeado fuera de env
    """

    host = APP_BASE_URL
    wait_time = between(0.5, 2)

    def on_start(self):
        self.sb_headers = supabase_headers()

    def supabase_get(self, path, name, range_header=None):
        """
        GET contra Supabase REST usando URL absoluta.
        Marca 401/403 como fallidos pero no detiene la prueba.
        """
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

    @task(30)
    def spa_and_assets(self):
        self.client.get("/", name="GET /")
        assets_to_load = random.sample(ASSETS, k=random.randint(1, min(2, len(ASSETS))))
        for asset in assets_to_load:
            self.client.get(asset, name="GET /assets/[chunk]")

    @task(35)
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

    @task(20)
    def orders_by_user(self):
        params = {
            "select": "*",
            "order": "created_at.desc",
            "user_id": f"eq.{TEST_USER_ID}",
        }
        range_header = random_range_header()
        path = "/orders?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET orders by user", range_header=range_header)

    @task(10)
    def users_admin_list(self):
        params = {
            "select": "id,email,full_name,role,created_at",
            "order": "created_at.desc",
        }
        range_header = random_range_header()
        path = "/users?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET users paginated", range_header=range_header)

    @task(5)
    def completed_orders_ids(self):
        params = {
            "select": "id",
            "status": "eq.completed",
        }
        range_header = random_range_header()
        path = "/orders?" + urlencode(params, safe=",*=")
        self.supabase_get(path, name="SB GET orders completed ids", range_header=range_header)
