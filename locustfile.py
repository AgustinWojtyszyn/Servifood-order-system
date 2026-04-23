import os
import random
import time
import uuid

from locust import HttpUser, between, task
from locust.exception import StopUser


SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

NORMAL_USER_EMAIL = os.getenv("NORMAL_USER_EMAIL", "normal@test.local")
NORMAL_USER_PASSWORD = os.getenv("NORMAL_USER_PASSWORD", "test123")
ADMIN_USER_EMAIL = os.getenv("ADMIN_USER_EMAIL", "admin@test.local")
ADMIN_USER_PASSWORD = os.getenv("ADMIN_USER_PASSWORD", "admin123")

MAX_LOGIN_RETRIES = int(os.getenv("MAX_LOGIN_RETRIES", "1"))
LOGIN_RETRY_BACKOFF_SEC = float(os.getenv("LOGIN_RETRY_BACKOFF_SEC", "4"))
ENABLE_WRITE_TASKS = os.getenv("ENABLE_WRITE_TASKS", "0") == "1"

LOCATIONS = ["Los Berros", "La Laja", "Padre Bueno"]


if not SUPABASE_URL:
    raise RuntimeError("Missing SUPABASE_URL (or VITE_SUPABASE_URL)")
if not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)")


class SupabaseUser(HttpUser):
    host = SUPABASE_URL
    wait_time = between(1, 3)
    abstract = True

    user_email = ""
    user_password = ""
    role_name = "user"

    def on_start(self):
        self.access_token = None
        self.user_id = None
        self.login_with_supabase()

    def _login_headers(self):
        return {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }

    def _auth_headers(self, with_content_type=False):
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {self.access_token}",
        }
        if with_content_type:
            headers["Content-Type"] = "application/json"
        return headers

    @staticmethod
    def _body_exact(resp):
        return (resp.text or "").strip()

    def login_with_supabase(self):
        endpoint = "/auth/v1/token?grant_type=password"
        payload = {
            "email": self.user_email,
            "password": self.user_password,
        }

        for attempt in range(1, MAX_LOGIN_RETRIES + 1):
            with self.client.post(
                endpoint,
                json=payload,
                headers=self._login_headers(),
                name=f"AUTH {self.role_name} login",
                catch_response=True,
            ) as resp:
                if resp.status_code == 200:
                    try:
                        data = resp.json() if resp.text else {}
                    except Exception as exc:
                        resp.failure(f"login invalid JSON response ({exc})")
                        continue

                    token = data.get("access_token")
                    user = data.get("user") or {}
                    user_id = user.get("id")

                    if not token or not user_id:
                        resp.failure("login response missing access_token or user.id")
                        continue

                    self.access_token = token
                    self.user_id = user_id
                    resp.success()
                    return

                body = self._body_exact(resp)

                if resp.status_code == 429:
                    resp.failure(
                        f"rate limited (429) attempt={attempt}/{MAX_LOGIN_RETRIES} body={body}"
                    )
                elif resp.status_code == 400:
                    resp.failure(
                        f"bad request (400) attempt={attempt}/{MAX_LOGIN_RETRIES} body={body}"
                    )
                else:
                    resp.failure(
                        f"unexpected status={resp.status_code} attempt={attempt}/{MAX_LOGIN_RETRIES} body={body}"
                    )

            if attempt < MAX_LOGIN_RETRIES:
                sleep_for = LOGIN_RETRY_BACKOFF_SEC * attempt
                time.sleep(sleep_for)

        raise StopUser(
            f"{self.role_name} login failed after {MAX_LOGIN_RETRIES} attempts"
        )

    def checked(self, method, path, name, expected=(200,), headers=None, **kwargs):
        req_headers = headers or self._auth_headers()

        with self.client.request(
            method,
            path,
            headers=req_headers,
            name=name,
            catch_response=True,
            **kwargs,
        ) as resp:
            if resp.status_code in (401, 403, 429) or resp.status_code >= 500:
                body = self._body_exact(resp)
                resp.failure(
                    f"{name} auth/rate/server failure status={resp.status_code} body={body}"
                )
                return None

            if resp.status_code not in expected:
                body = self._body_exact(resp)
                resp.failure(
                    f"{name} unexpected={resp.status_code} expected={expected} body={body}"
                )
                return None

            resp.success()
            if not resp.text:
                return {}
            try:
                return resp.json()
            except Exception:
                return {}

class NormalUser(SupabaseUser):
    weight = 4
    role_name = "normal"
    user_email = NORMAL_USER_EMAIL
    user_password = NORMAL_USER_PASSWORD

    @task(3)
    def profile(self):
        self.checked("GET", "/auth/v1/user", "API GET /auth/v1/user")

    @task(3)
    def my_orders(self):
        self.checked(
            "GET",
            f"/rest/v1/orders?select=id,status,created_at,location,service&user_id=eq.{self.user_id}&order=created_at.desc&limit=20",
            "API GET /rest/v1/orders (my)",
            headers=self._auth_headers(),
        )

    @task(2)
    def my_features(self):
        self.checked(
            "GET",
            f"/rest/v1/user_features?select=feature,enabled&user_id=eq.{self.user_id}",
            "API GET /rest/v1/user_features (my)",
            headers=self._auth_headers(),
        )

    @task(2)
    def menu_list(self):
        self.checked(
            "GET",
            "/rest/v1/menu_items?select=id,name,description,created_at,menu_date&order=created_at.desc&limit=20",
            "API GET /rest/v1/menu_items",
            headers=self._auth_headers(),
        )

    @task(1)
    def create_order_rpc(self):
        if not ENABLE_WRITE_TASKS:
            return

        idem = f"locust-{self.user_id}-{uuid.uuid4()}"
        payload = {
            "p_user_id": self.user_id,
            "p_idempotency_key": idem,
            "p_payload": {
                "user_id": self.user_id,
                "location": random.choice(LOCATIONS),
                "service": "lunch",
                "items": [{"id": "menu-1", "name": "Milanesa con papas", "quantity": 1}],
            },
        }

        self.checked(
            "POST",
            "/rest/v1/rpc/create_order_idempotent",
            "API POST /rest/v1/rpc/create_order_idempotent",
            headers=self._auth_headers(with_content_type=True),
            json=payload,
            expected=(200, 201),
        )


class AdminUser(SupabaseUser):
    weight = 1
    role_name = "admin"
    user_email = ADMIN_USER_EMAIL
    user_password = ADMIN_USER_PASSWORD

    @task(2)
    def admin_orders(self):
        self.checked(
            "GET",
            "/rest/v1/orders?select=id,status,created_at,user_id,location&order=created_at.desc&limit=30",
            "API GET /rest/v1/orders (admin)",
            headers=self._auth_headers(),
        )

    @task(2)
    def admin_users(self):
        self.checked(
            "GET",
            "/rest/v1/users?select=id,email,role,created_at&order=created_at.desc&limit=30",
            "API GET /rest/v1/users (admin)",
            headers=self._auth_headers(),
        )

    @task(1)
    def admin_audit_logs(self):
        self.checked(
            "GET",
            "/rest/v1/audit_logs?select=id,action,created_at&order=created_at.desc&limit=30",
            "API GET /rest/v1/audit_logs (admin)",
            headers=self._auth_headers(),
            expected=(200,),
        )

    @task(1)
    def archive_pending_rpc(self):
        if not ENABLE_WRITE_TASKS:
            return
        self.checked(
            "POST",
            "/rest/v1/rpc/archive_orders_bulk",
            "API POST /rest/v1/rpc/archive_orders_bulk (admin)",
            headers=self._auth_headers(with_content_type=True),
            json={"statuses": ["pending"]},
            expected=(200, 204),
        )
