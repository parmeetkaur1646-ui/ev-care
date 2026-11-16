// ===== DATA FILE: edit text, prices and names here. No logic in this file. =====
const APP_DATA = {
  upiId: "9304308473@naviaxis",
  serverUrl: "http://127.0.0.1:5000",   // address of the Flask server (server/app.py)
  supportPhone: "+91-93043-08473",   // phone number shown on the Support page
  // Google Pay settings. "TEST" shows Google's test sheet and moves NO money.
  // For real payments: set environment "PRODUCTION", add your Google Pay merchantId and a real payment gateway.
  googlePay: { environment: "TEST", merchantId: "", merchantName: "EV CARE", gateway: "example", gatewayMerchantId: "exampleGatewayMerchantId" },
  demoCardOtp: "123456",   // demo bank OTP used in the card payment flow
  // UPI apps shown on the payment screen (scheme = how each app is opened on a phone)
  upiApps: [
    { name: "Google Pay", scheme: "tez://upi/pay" },
    { name: "PhonePe", scheme: "phonepe://pay" },
    { name: "Paytm", scheme: "paytmmp://pay" },
    { name: "Other UPI app", scheme: "upi://pay" }
  ],
  banks: ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank", "Kotak Mahindra Bank"],
  // Paste your Firebase web-app config here to send REAL SMS OTPs. Leave "" for demo mode.
  firebaseConfig: { apiKey: "", authDomain: "", projectId: "", appId: "" },
  technician: { name: "Jasbir Singh", rating: "4.8", jobs: 120 },
  images: { splash: "images/splash.png", onboard: "images/onboard.png", home: "images/home.png",
    add: "images/add.png", map: "images/map.png", tech: "images/tech.png", tyre: "images/tyre.png",
    parts: "images/partsbanner.png", pkg: "images/pkg.png",
    modes: { home: "images/modehome.png", pickup: "images/modevan.png", centre: "images/modecentre.png" } },
  trackTimes: ["10:20 AM", "10:25 AM", "10:40 AM", "", ""],
  services: [
    { id: "regular", icon: "wrench", name: "Regular Service", price: 299 },
    { id: "electrical", icon: "high_voltage", name: "Electrical Problem", price: 399 },
    { id: "battery", icon: "battery", name: "Battery Service", price: 499 },
    { id: "tyre", icon: "tyre", name: "Tyre & Brake", price: 299 },
    { id: "emergency", icon: "police_car_light", name: "Emergency Service", price: 499 },
    { id: "centre", icon: "office_building", name: "Book at Service Centre", price: 299 }
  ],
  modes: [
    { id: "home", name: "Home Service", note: "Technician at your home" },
    { id: "pickup", name: "Pickup & Drop", note: "We pick & deliver" },
    { id: "centre", name: "Visit Service Centre", note: "Nearest centre" }
  ],
  slots: ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "04:00 PM"],
  trackSteps: ["Booking Confirmed", "Technician Assigned", "Technician On The Way", "Service In Progress", "Completed"],
  checklist: ["Brake Check", "Tyre Check", "Battery Check"],
  bill: { service: 299, parts: 100, gst: 100 },   // total = 499
  parts: [   // img = a picture that matches the part name
    { id: 1, name: "CE-AT Tyre", price: 1999, type: "Tyres", img: "images/tyre.png" },
    { id: 2, name: "Li-ion Battery 48V", price: 12999, type: "Battery", img: "images/icons/battery.png" },
    { id: 3, name: "Brake Pad Set", price: 399, type: "Parts", img: "images/parts/brake-pad.svg" },
    { id: 4, name: "Tubeless Tyre 90/90", price: 1499, type: "Tyres", img: "images/parts/tyre.svg" },
    { id: 5, name: "Battery Charger", price: 1799, type: "Battery", img: "images/icons/electric_plug.png" },
    { id: 6, name: "Side Mirror Pair", price: 349, type: "Parts", img: "images/parts/side-mirror.svg" }
  ],
  info: {  // text for the simple Profile pages
    Addresses: "No saved addresses yet.",
    Notifications: "You have no new notifications.",
    "Support & Help": "Call us on 1800-123-4567 any time.",
    "About App": "EV CARE v1.0 - Your EV. Our Responsibility."
  }
};
