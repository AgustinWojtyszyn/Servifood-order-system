from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def home():
    return """
    <h1>Servidor de prueba activo</h1>
    <p>Flask está funcionando correctamente.</p>
    """


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    return jsonify({
        "status": "success",
        "user": data.get("username")
    })


if __name__ == "__main__":
    app.run(debug=True)
