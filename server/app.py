# EV CARE payment server (Flask + SQLite).
# The website asks this server to create an order, and the server decides the amount.
# The price is NEVER trusted from the browser.
import random
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request

app = Flask(__name__)
DB_FILE = "evcare.db"

BILL = {"service": 299, "parts": 100, "gst": 100}   # keep the same numbers as "bill" in data.js
GOOGLE_PAY_ENVIRONMENT = "TEST"                      # "TEST" = no real money moves


# ---------- Database helpers ----------
def open_db():
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def setup_database():
    with open_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY, booking_id TEXT, amount INTEGER,
            status TEXT, method TEXT, payment_ref TEXT, created TEXT)""")


def find_order(order_id):
    with open_db() as db:
        return db.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,)).fetchone()


def update_order(order_id, status, method, payment_ref):
    with open_db() as db:
        db.execute("UPDATE orders SET status = ?, method = ?, payment_ref = ? WHERE order_id = ?",
                   (status, method, payment_ref, order_id))


def error(message, code):
    return jsonify({"error": message}), code


# ---------- Let the website (Live Server) talk to this server ----------
@app.after_request
def allow_website(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# ---------- The place where a real payment gateway is connected ----------
def charge_token(token, amount):
    """Take the Google Pay token and charge `amount` rupees. Returns a payment reference."""
    if GOOGLE_PAY_ENVIRONMENT == "TEST":
        return "GPAYTEST" + str(random.randint(10000000, 99999999))   # test mode: nothing is charged
    # Real payments: send `token` to your payment gateway here (Razorpay, Stripe, Cashfree...).
    raise RuntimeError("Information not available yet: connect a payment gateway in charge_token()")


# ---------- Routes ----------
@app.get("/")
def home():
    return "EV CARE server is running"


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    order_id = "ORD" + str(random.randint(100000, 999999))
    amount = BILL["service"] + BILL["parts"] + BILL["gst"]
    with open_db() as db:
        db.execute("INSERT INTO orders VALUES (?, ?, ?, 'created', '', '', ?)",
                   (order_id, data.get("booking_id", ""), amount, datetime.now().isoformat()))
    return jsonify({"order_id": order_id, "amount": amount})


@app.post("/api/pay/googlepay")
def pay_with_google_pay():
    data = request.get_json(silent=True) or {}
    order = find_order(data.get("order_id"))
    if order is None:
        return error("Order not found", 404)
    if order["status"] == "paid":
        return error("This order is already paid", 400)
    if not data.get("token"):
        return error("Missing Google Pay token", 400)
    try:
        payment_ref = charge_token(data["token"], order["amount"])
    except Exception as problem:
        update_order(order["order_id"], "failed", "Google Pay", "")
        return error(str(problem), 502)
    update_order(order["order_id"], "paid", "Google Pay", payment_ref)
    return jsonify({"status": "paid", "payment_ref": payment_ref})


@app.post("/api/pay/upi")
def record_upi_payment():
    # We cannot check a UPI payment without a bank/gateway, so it is saved as "pending verification".
    data = request.get_json(silent=True) or {}
    order = find_order(data.get("order_id"))
    if order is None:
        return error("Order not found", 404)
    update_order(order["order_id"], "pending verification", "UPI", str(data.get("reference", "")))
    return jsonify({"status": "pending verification"})


@app.get("/api/orders/<order_id>")
def get_order(order_id):
    order = find_order(order_id)
    return jsonify(dict(order)) if order else error("Order not found", 404)


if __name__ == "__main__":
    setup_database()
    app.run(port=5000, debug=True)
