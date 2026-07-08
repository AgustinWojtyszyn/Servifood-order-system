from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request

app = Flask(__name__)


# Usuarios de prueba 100% locales
USERS = {
    "normal@test.local": {"password": "test123", "role": "user", "name": "Usuario Normal"},
    "admin@test.local": {"password": "admin123", "role": "admin", "name": "Administrador"},
}

# Tokens simples en memoria para entorno local
TOKENS = {}

MENU_ITEMS = [
    {"id": "menu-1", "name": "Milanesa con papas", "category": "main"},
    {"id": "menu-2", "name": "Pollo al horno", "category": "main"},
    {"id": "menu-3", "name": "Ensalada mixta", "category": "side"},
]

ORDERS = []
ORDER_SEQ = 1


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def require_auth(admin_only=False):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "missing bearer token"}), 401

            token = auth_header.split(" ", 1)[1].strip()
            user = TOKENS.get(token)
            if not user:
                return jsonify({"error": "invalid token"}), 401

            if admin_only and user.get("role") != "admin":
                return jsonify({"error": "forbidden"}), 403

            request.user = user
            return handler(*args, **kwargs)

        return wrapped

    return decorator


@app.route("/")
def home():
    return """
    <h1>Servidor local de pruebas activo</h1>
    <p>Flask está funcionando correctamente para Locust.</p>
    """


@app.route("/health")
def health():
    return jsonify({"ok": True, "ts": utc_now()})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    user = USERS.get(username)
    if not user or user["password"] != password:
        return jsonify({"status": "error", "message": "invalid credentials"}), 401

    token = f"local-token-{username}-{int(datetime.now().timestamp())}"
    payload = {"username": username, "role": user["role"], "name": user["name"]}
    TOKENS[token] = payload

    return jsonify(
        {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": payload,
        }
    )


@app.route("/profile", methods=["GET"])
@require_auth()
def profile():
    return jsonify({"status": "success", "profile": request.user})


@app.route("/menu", methods=["GET"])
@require_auth()
def menu():
    return jsonify({"status": "success", "items": MENU_ITEMS})


@app.route("/orders", methods=["POST"])
@require_auth()
def create_order():
    global ORDER_SEQ
    data = request.get_json(silent=True) or {}
    items = data.get("items") or []
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "items required"}), 400

    order = {
        "id": ORDER_SEQ,
        "user": request.user["username"],
        "status": "pending",
        "location": data.get("location", "Los Berros"),
        "items": items,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    ORDER_SEQ += 1
    ORDERS.append(order)
    return jsonify({"status": "success", "order": order}), 201


@app.route("/orders/my", methods=["GET"])
@require_auth()
def my_orders():
    mine = [o for o in ORDERS if o["user"] == request.user["username"]]
    return jsonify({"status": "success", "orders": mine})


@app.route("/admin/dashboard", methods=["GET"])
@require_auth(admin_only=True)
def admin_dashboard():
    total = len(ORDERS)
    pending = len([o for o in ORDERS if o["status"] == "pending"])
    archived = len([o for o in ORDERS if o["status"] == "archived"])
    return jsonify({"status": "success", "metrics": {"total": total, "pending": pending, "archived": archived}})


@app.route("/admin/orders", methods=["GET"])
@require_auth(admin_only=True)
def admin_orders():
    return jsonify({"status": "success", "orders": ORDERS})


@app.route("/admin/orders/<int:order_id>/status", methods=["PATCH"])
@require_auth(admin_only=True)
def update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in {"pending", "preparing", "ready", "archived"}:
        return jsonify({"error": "invalid status"}), 400

    for order in ORDERS:
        if order["id"] == order_id:
            order["status"] = new_status
            order["updated_at"] = utc_now()
            return jsonify({"status": "success", "order": order})

    return jsonify({"error": "order not found"}), 404


@app.route("/admin/orders/<int:order_id>/archive", methods=["POST"])
@require_auth(admin_only=True)
def archive_order(order_id):
    for order in ORDERS:
        if order["id"] == order_id:
            order["status"] = "archived"
            order["updated_at"] = utc_now()
            return jsonify({"status": "success", "order": order})

    return jsonify({"error": "order not found"}), 404


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
