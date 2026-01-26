from locust import HttpUser, task, between
import os
import random
from urllib.parse import urlencode

APP_HOST = "https://food-order-app-3avy.onrender.com"
SUPABASE_URL = os.environ.get("SUPABASE_URL")  # ej: https://xxxx.supabase.co
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

# Assets (los que viste en Network). Si cambian con cada build, actualizalos cuando despliegues.
ASSETS = [
    "/assets/OrderCompanySelector-Cpkt6TVN.js",
    "/assets/companyConfig-DXvnmIWp.js",
    "/assets/OrderForm-C71SxUJH.js",
    "/assets/Imageservifood%20logo-DO8gzfSS.jpg",
]


def supabase_headers():
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Accept": "application/json",
    }


class AppReadOnlyUser(HttpUser):
    """
    Recorrido 'real' sin huella sensible:
    - Solo GET (sin inserts/updates)
    - Sin PII
    - Sin user_id hardcodeado
    """

    host = APP_HOST
    wait_time = between(0.5, 2)

    def on_start(self):
        self.sb_headers = supabase_headers()
        # Client separado para Supabase (otro host).
        self.sb = None
        if SUPABASE_URL and self.sb_headers:
            self.sb = self.client.__class__(
                base_url=SUPABASE_URL,
                request_event=self.environment.events.request,
                user=self,
            )

    @task(5)
    def spa_root(self):
        self.client.get("/", name="GET /")

    @task(3)
    def load_assets(self):
        asset = random.choice(ASSETS)
        self.client.get(asset, name="GET /assets/[chunk]")

    @task(6)
    def supabase_read(self):
        """
        Replica tus lecturas: users, menu_items, custom_options, orders
        (sin filtrar por user_id para no depender de UUID real)
        """
        if not self.sb:
            return

        choice = random.choice(["users", "menu_items", "custom_options", "orders"])

        if choice == "users":
            params = {
                "select": "id,email,full_name,role,created_at",
                "order": "created_at.desc",
                "limit": "20",
            }
            path = "/rest/v1/users?" + urlencode(params, safe=",*=")
            self.sb.get(path, headers=self.sb_headers, name="SB GET users")

        elif choice == "orders":
            params = {
                "select": "*",
                "order": "created_at.desc",
                "limit": "20",
            }
            path = "/rest/v1/orders?" + urlencode(params, safe=",*=")
            self.sb.get(path, headers=self.sb_headers, name="SB GET orders")

        elif choice == "menu_items":
            params = {
                "select": "id,name,description,created_at",
                "order": "created_at.desc",
                "limit": "50",
            }
            path = "/rest/v1/menu_items?" + urlencode(params, safe=",*=")
            self.sb.get(path, headers=self.sb_headers, name="SB GET menu_items")

        else:  # custom_options
            params = {
                "select": "*",
                "order": "order_position.asc",
                "limit": "200",
            }
            path = "/rest/v1/custom_options?" + urlencode(params, safe=",*=")
            self.sb.get(path, headers=self.sb_headers, name="SB GET custom_options")
