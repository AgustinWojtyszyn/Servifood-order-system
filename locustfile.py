import os
import random
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import uuid4

from locust import HttpUser, between, task
from locust.exception import StopUser


APP_BASE_URL = os.getenv("APP_BASE_URL", "http://127.0.0.1:5000").rstrip("/")
SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "")).rstrip("/")
SUPABASE_REST_URL = os.getenv("SUPABASE_REST_URL", f"{SUPABASE_URL}/rest/v1").rstrip("/")
SUPABASE_AUTH_URL = os.getenv("SUPABASE_AUTH_URL", f"{SUPABASE_URL}/auth/v1").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", "")).strip()

NORMAL_USER_EMAIL = os.getenv("NORMAL_USER_EMAIL", "").strip()
NORMAL_USER_PASSWORD = os.getenv("NORMAL_USER_PASSWORD", "").strip()
ADMIN_USER_EMAIL = os.getenv("ADMIN_USER_EMAIL", "").strip()
ADMIN_USER_PASSWORD = os.getenv("ADMIN_USER_PASSWORD", "").strip()

LOCATIONS = ["Los Berros", "La Laja", "Padre Bueno", "Ccp", "Genneia"]
COMPANIES = ["laja", "losberros", "padrebueno", "ccp", "genneia"]
ORDER_STATUS_FLOW = ["pending", "preparing", "ready", "archived"]


def tomorrow_iso_date():
    return (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()


class BaseAppUser(HttpUser):
    host = APP_BASE_URL
    wait_time = between(1, 3)
    abstract = True

    user_email = ""
    user_password = ""
    role_name = "user"

    def on_start(self):
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.user_email_runtime = None

        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise StopUser("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY")

        if not self.user_email or not self.user_password:
            raise StopUser(
                f"Missing credentials for role '{self.role_name}'. Set env vars for this user before running Locust."
            )

        self.login_with_supabase(self.user_email, self.user_password)

    @property
    def supabase_base_headers(self):
        return {
            "apikey": SUPABASE_ANON_KEY,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    @property
    def auth_headers(self):
        if not self.access_token:
            return dict(self.supabase_base_headers)
        headers = dict(self.supabase_base_headers)
        headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def login_with_supabase(self, email, password):
        login_url = f"{SUPABASE_AUTH_URL}/token?grant_type=password"
        payload = {"email": email, "password": password}

        with self.client.post(
            login_url,
            json=payload,
            headers=self.supabase_base_headers,
            name=f"AUTH {self.role_name} login",
            catch_response=True,
        ) as resp:
            if resp.status_code in (401, 403, 500):
                resp.failure(f"auth error {resp.status_code}")
                raise StopUser(f"{self.role_name} login failed with status {resp.status_code}")
            if resp.status_code != 200:
                resp.failure(f"auth unexpected {resp.status_code}")
                raise StopUser(f"{self.role_name} login unexpected status {resp.status_code}")

            data = resp.json() if resp.text else {}
            token = data.get("access_token")
            user = data.get("user") or {}
            if not token or not user.get("id"):
                resp.failure("auth payload missing access_token/user.id")
                raise StopUser(f"{self.role_name} login response missing token or user id")

            self.access_token = token
            self.refresh_token = data.get("refresh_token")
            self.user_id = user.get("id")
            self.user_email_runtime = user.get("email")
            resp.success()

    def request_with_checks(
        self,
        method,
        url,
        name,
        *,
        headers=None,
        json_body=None,
        data_body=None,
        expected_statuses=(200,),
    ):
        with self.client.request(
            method,
            url,
            name=name,
            headers=headers,
            json=json_body,
            data=data_body,
            catch_response=True,
        ) as resp:
            if resp.status_code in (401, 403, 500):
                resp.failure(f"{name} failed {resp.status_code}")
                return None
            if resp.status_code not in expected_statuses:
                resp.failure(f"{name} unexpected {resp.status_code}")
                return None
            resp.success()
            if not resp.text:
                return {}
            try:
                return resp.json()
            except Exception:
                return {"raw": resp.text}

    def supabase_get(self, path, name, query=None, expected_statuses=(200,)):
        url = f"{SUPABASE_REST_URL}/{path.lstrip('/')}"
        if query:
            url = f"{url}?{urlencode(query, safe=',.*()')}"
        return self.request_with_checks("GET", url, name, headers=self.auth_headers, expected_statuses=expected_statuses)

    def supabase_post(self, path, name, payload, expected_statuses=(200, 201)):
        url = f"{SUPABASE_REST_URL}/{path.lstrip('/')}"
        return self.request_with_checks(
            "POST",
            url,
            name,
            headers=self.auth_headers,
            json_body=payload,
            expected_statuses=expected_statuses,
        )

    def supabase_patch(self, path, name, payload, query=None, expected_statuses=(200, 204)):
        url = f"{SUPABASE_REST_URL}/{path.lstrip('/')}"
        if query:
            url = f"{url}?{urlencode(query, safe=',.*()')}"
        headers = dict(self.auth_headers)
        headers["Prefer"] = "return=representation"
        return self.request_with_checks(
            "PATCH",
            url,
            name,
            headers=headers,
            json_body=payload,
            expected_statuses=expected_statuses,
        )

    def make_order_payload(self):
        location = random.choice(LOCATIONS)
        menu_item_name = random.choice(
            [
                "Menú principal",
                "Milanesa con papas",
                "Pollo al horno",
                "Ensalada completa",
            ]
        )
        return {
            "user_id": self.user_id,
            "location": location,
            "customer_name": self.user_email_runtime or self.user_email,
            "customer_email": self.user_email_runtime or self.user_email,
            "customer_phone": "+5492641234567",
            "items": [{"id": "menu-main", "name": menu_item_name, "quantity": 1}],
            "comments": "Pedido de carga Locust",
            "delivery_date": tomorrow_iso_date(),
            "status": "pending",
            "total_items": 1,
            "custom_responses": [],
            "idempotency_key": str(uuid4()),
            "service": "lunch",
        }


class NormalUser(BaseAppUser):
    weight = 4
    role_name = "normal"
    user_email = NORMAL_USER_EMAIL
    user_password = NORMAL_USER_PASSWORD

    @task(2)
    def home(self):
        self.request_with_checks("GET", "/", "WEB GET /", expected_statuses=(200,))

    @task(2)
    def view_profile(self):
        url = f"{SUPABASE_AUTH_URL}/user"
        self.request_with_checks("GET", url, "AUTH GET profile", headers=self.auth_headers, expected_statuses=(200,))

    @task(3)
    def view_menu(self):
        self.supabase_get(
            "menu_items",
            "SB GET menu_items by date",
            query={
                "select": "id,name,description,menu_date,created_at",
                "menu_date": f"eq.{tomorrow_iso_date()}",
                "order": "created_at.desc",
            },
        )
        self.supabase_post(
            "rpc/get_visible_custom_options",
            "SB RPC get_visible_custom_options",
            {
                "p_company": random.choice(COMPANIES),
                "p_meal": "lunch",
                "p_date": tomorrow_iso_date(),
                "p_country_code": "AR",
            },
            expected_statuses=(200,),
        )

    @task(3)
    def create_order(self):
        pending_orders = self.supabase_get(
            "orders",
            "SB GET my pending orders",
            query={
                "select": "id,status",
                "user_id": f"eq.{self.user_id}",
                "status": "eq.pending",
                "limit": "1",
            },
        )
        if isinstance(pending_orders, list) and pending_orders:
            return

        order_payload = self.make_order_payload()
        self.supabase_post(
            "rpc/create_order_idempotent",
            "SB RPC create_order_idempotent",
            {
                "p_user_id": self.user_id,
                "p_idempotency_key": order_payload["idempotency_key"],
                "p_payload": order_payload,
            },
            expected_statuses=(200,),
        )

    @task(3)
    def view_my_orders(self):
        self.supabase_get(
            "orders",
            "SB GET my orders",
            query={
                "select": "id,status,service,location,delivery_date,total_items,created_at",
                "user_id": f"eq.{self.user_id}",
                "order": "created_at.desc",
                "limit": "25",
            },
        )


class AdminUser(BaseAppUser):
    weight = 1
    role_name = "admin"
    user_email = ADMIN_USER_EMAIL
    user_password = ADMIN_USER_PASSWORD

    @task(2)
    def admin_dashboard(self):
        self.request_with_checks("GET", "/admin", "WEB GET /admin", expected_statuses=(200,))
        self.request_with_checks("GET", "/health", "WEB GET /health", expected_statuses=(200,))

    @task(3)
    def list_global_orders(self):
        self.supabase_get(
            "orders",
            "SB GET orders global",
            query={
                "select": "id,user_id,status,service,location,delivery_date,created_at",
                "order": "created_at.desc",
                "limit": "100",
            },
        )

    @task(2)
    def list_users(self):
        self.supabase_get(
            "users",
            "SB GET users admin",
            query={
                "select": "id,email,full_name,role,created_at",
                "order": "created_at.desc",
                "limit": "100",
            },
        )

    @task(2)
    def update_order_status_or_archive(self):
        orders = self.supabase_get(
            "orders",
            "SB GET pending order for admin update",
            query={
                "select": "id,status",
                "status": "eq.pending",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        if not isinstance(orders, list) or not orders:
            return

        order_id = orders[0].get("id")
        if not order_id:
            return

        next_status = random.choice(ORDER_STATUS_FLOW[1:])
        self.supabase_patch(
            "orders",
            "SB PATCH order status",
            {"status": next_status, "updated_at": datetime.now(timezone.utc).isoformat()},
            query={"id": f"eq.{order_id}"},
            expected_statuses=(200,),
        )

    @task(1)
    def audit_and_metrics(self):
        self.supabase_get(
            "audit_logs",
            "SB GET audit_logs",
            query={
                "select": "id,action,details,created_at,request_id",
                "order": "created_at.desc",
                "limit": "100",
            },
        )
        self.supabase_get(
            "orders",
            "SB GET orders metrics range",
            query={
                "select": "id,status,delivery_date,total_items,created_at,items,custom_responses",
                "order": "created_at.desc",
                "limit": "200",
            },
        )
