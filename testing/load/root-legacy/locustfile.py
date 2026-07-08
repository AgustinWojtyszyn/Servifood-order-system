import os
import random
import time
import uuid
from itertools import count

from locust import HttpUser, between, events, tag, task
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
NORMAL_FIXED_COUNT = int(os.getenv("NORMAL_FIXED_COUNT", "0"))
ADMIN_FIXED_COUNT = int(os.getenv("ADMIN_FIXED_COUNT", "0"))

# Optional pool format: email1:pass1,email2:pass2,email3:pass3
NORMAL_USER_CREDENTIALS = os.getenv("NORMAL_USER_CREDENTIALS", "")
ADMIN_USER_CREDENTIALS = os.getenv("ADMIN_USER_CREDENTIALS", "")

LOCATIONS = ["Los Berros", "La Laja", "Padre Bueno"]


if not SUPABASE_URL:
    raise RuntimeError("Missing SUPABASE_URL (or VITE_SUPABASE_URL)")
if not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)")


def _parse_credentials(raw_value, fallback_email, fallback_password):
    creds = []
    for chunk in (raw_value or "").split(","):
        item = chunk.strip()
        if not item:
            continue
        if ":" not in item:
            continue
        email, password = item.split(":", 1)
        email = email.strip()
        password = password.strip()
        if email and password:
            creds.append((email, password))

    if creds:
        return creds
    return [(fallback_email, fallback_password)]


NORMAL_CREDENTIAL_POOL = _parse_credentials(
    NORMAL_USER_CREDENTIALS,
    NORMAL_USER_EMAIL,
    NORMAL_USER_PASSWORD,
)
ADMIN_CREDENTIAL_POOL = _parse_credentials(
    ADMIN_USER_CREDENTIALS,
    ADMIN_USER_EMAIL,
    ADMIN_USER_PASSWORD,
)


def _tags_to_set(raw_tags):
    if not raw_tags:
        return set()
    if isinstance(raw_tags, str):
        return {raw_tags}
    return set(raw_tags)


def _has_active_users(user_cls):
    return (getattr(user_cls, "fixed_count", 0) > 0) or (getattr(user_cls, "weight", 0) > 0)


@events.init.add_listener
def configure_users_by_tags(environment, **_kwargs):
    # Works in headless and web UI; in UI this reacts to initial CLI tags.
    options = getattr(environment, "parsed_options", None)
    tags = _tags_to_set(getattr(options, "tags", None))

    if "write" in tags and not ENABLE_WRITE_TASKS:
        raise RuntimeError(
            "Invalid test config: --tags write requires ENABLE_WRITE_TASKS=1."
        )

    # Auto-compose user classes for tag-focused runs to avoid 'no tasks left after filtering'.
    # Keep smoke and mixed runs unchanged.
    if "read" in tags and "smoke" not in tags and "admin" not in tags:
        AdminUser.weight = 0
        AdminUser.fixed_count = 0

    if "admin" in tags and "smoke" not in tags and "read" not in tags:
        NormalUser.weight = 0
        NormalUser.fixed_count = 0

    if not _has_active_users(NormalUser) and not _has_active_users(AdminUser):
        raise RuntimeError(
            "Invalid test config: no active user classes after tag filtering/composition."
        )


class SupabaseUser(HttpUser):
    host = SUPABASE_URL
    wait_time = between(1, 3)
    abstract = True

    role_name = "user"

    def on_start(self):
        self.access_token = None
        self.user_id = None
        self.user_profile = None
        self.login_with_supabase()

    def pick_credentials(self):
        raise NotImplementedError

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
        self.user_email, self.user_password = self.pick_credentials()

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
                    self.user_profile = user
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
                time.sleep(LOGIN_RETRY_BACKOFF_SEC * attempt)

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
    weight = 5
    fixed_count = NORMAL_FIXED_COUNT
    role_name = "normal"
    _pool_counter = count(0)

    def pick_credentials(self):
        idx = next(self._pool_counter) % len(NORMAL_CREDENTIAL_POOL)
        return NORMAL_CREDENTIAL_POOL[idx]

    @tag("smoke", "read")
    @task(3)
    def read_profile(self):
        self.checked(
            "GET",
            f"/rest/v1/users?select=id,email,full_name,role&id=eq.{self.user_id}&limit=1",
            "READ /rest/v1/users (self)",
        )

    @tag("admin")
    @task(1)
    def admin_tag_compat_profile(self):
        # Real request to keep class task set non-empty when filtering by --tags admin.
        self.checked(
            "GET",
            f"/rest/v1/users?select=id,email,full_name,role&id=eq.{self.user_id}&limit=1",
            "READ /rest/v1/users (self-normal-compat)",
        )

    @tag("smoke", "read")
    @task(4)
    def read_my_orders(self):
        self.checked(
            "GET",
            (
                "/rest/v1/orders?select=id,status,created_at,location,service"
                f"&user_id=eq.{self.user_id}&order=created_at.desc&limit=20"
            ),
            "READ /rest/v1/orders (my)",
        )

    @tag("read")
    @task(2)
    def read_my_features(self):
        self.checked(
            "GET",
            f"/rest/v1/user_features?select=feature,enabled&user_id=eq.{self.user_id}",
            "READ /rest/v1/user_features (my)",
        )

    @tag("smoke", "read")
    @task(3)
    def read_menu(self):
        self.checked(
            "GET",
            (
                "/rest/v1/menu_items?select=id,name,description,created_at,menu_date"
                "&order=created_at.desc&limit=20"
            ),
            "READ /rest/v1/menu_items",
        )

    @tag("write")
    @task(6)
    def write_create_order(self):
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
                "comments": "LOAD_TEST",
                "source": "load_test",
                "items": [{"id": "menu-1", "name": "Milanesa con papas", "quantity": 1}],
            },
        }

        self.checked(
            "POST",
            "/rest/v1/rpc/create_order_idempotent",
            "WRITE /rest/v1/rpc/create_order_idempotent",
            headers=self._auth_headers(with_content_type=True),
            json=payload,
            expected=(200, 201),
        )


class AdminUser(SupabaseUser):
    weight = 1
    fixed_count = ADMIN_FIXED_COUNT
    role_name = "admin"
    _pool_counter = count(0)

    def pick_credentials(self):
        idx = next(self._pool_counter) % len(ADMIN_CREDENTIAL_POOL)
        return ADMIN_CREDENTIAL_POOL[idx]

    @tag("smoke", "admin")
    @task(2)
    def admin_orders(self):
        self.checked(
            "GET",
            "/rest/v1/orders?select=id,status,created_at,user_id,location&order=created_at.desc&limit=30",
            "ADMIN /rest/v1/orders",
        )

    @tag("read")
    @task(1)
    def read_tag_compat_profile(self):
        # Real request to keep class task set non-empty when filtering by --tags read.
        self.checked(
            "GET",
            f"/rest/v1/users?select=id,email,full_name,role&id=eq.{self.user_id}&limit=1",
            "READ /rest/v1/users (self-admin-compat)",
        )

    @tag("smoke", "admin")
    @task(2)
    def admin_users(self):
        self.checked(
            "GET",
            "/rest/v1/users?select=id,email,role,created_at&order=created_at.desc&limit=30",
            "ADMIN /rest/v1/users",
        )

    @tag("admin")
    @task(1)
    def admin_audit_logs(self):
        self.checked(
            "GET",
            "/rest/v1/audit_logs?select=id,action,created_at&order=created_at.desc&limit=30",
            "ADMIN /rest/v1/audit_logs",
        )

    @tag("admin", "write")
    @task(1)
    def admin_archive_pending(self):
        if not ENABLE_WRITE_TASKS:
            return

        self.checked(
            "POST",
            "/rest/v1/rpc/archive_orders_bulk",
            "ADMIN /rest/v1/rpc/archive_orders_bulk",
            headers=self._auth_headers(with_content_type=True),
            json={"statuses": ["pending"]},
            expected=(200, 204),
        )
