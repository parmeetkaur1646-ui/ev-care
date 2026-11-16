// ===== EV CARE logic. All text/prices come from data.js =====

// ---- Saved state (kept in the browser so refresh does not lose data) ----
// Each phone number has its own saved profile (name, scooter, bookings, cart).
function freshUser() { return { name: "", phone: "", scooter: null, bookings: [], cart: 0, trackStep: 0, current: null }; }
const state = Object.assign(freshUser(), { loggedIn: false });
function save() { if (state.phone) localStorage.setItem("evcare_user_" + state.phone, JSON.stringify(state)); }
function loadUser(phone, name) {                // log in as this phone number
  const savedUser = JSON.parse(localStorage.getItem("evcare_user_" + phone) || "null");
  Object.assign(state, freshUser(), savedUser || {}, { phone: phone, loggedIn: true });
  if (name) state.name = name;
  if (state.current) state.current = state.bookings.find(b => b.id === state.current.id) || state.current;
  localStorage.setItem("evcare_last", phone); save();
}
function logout() {
  save(); localStorage.removeItem("evcare_last");
  Object.assign(state, freshUser(), { loggedIn: false });
}
const lastPhone = localStorage.getItem("evcare_last");
if (lastPhone) loadUser(lastPhone);              // stay logged in after a refresh
function prettyPhone() { return "+91 " + state.phone.slice(0, 5) + " " + state.phone.slice(5); }

let draft = {}, step = 1, payMethod = "upi", partFilter = "All", timer = null;
const TAB_SCREENS = ["home", "bookings", "parts", "profile"];
const OLD_SCOOTER_SVG = '<svg viewBox="0 0 200 90" width="170"><circle cx="45" cy="68" r="15" fill="#1967D2"/><circle cx="155" cy="68" r="15" fill="#1967D2"/><path d="M45 68 L90 68 L120 40 L150 40 L155 68 M120 40 L112 18 L132 18" stroke="#4aa3ff" stroke-width="7" fill="none"/><rect x="70" y="44" width="40" height="18" rx="6" fill="#4aa3ff"/></svg>';
const $ = id => document.getElementById(id);

// ---- Screen switching ----
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  $("nav").classList.toggle("show", TAB_SCREENS.includes(id));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.go === id));
  if (timer && id !== "tracking") { clearInterval(timer); timer = null; }
  const render = { home: renderHome, addScooter: fillScooterForm, bookings: renderBookings,
    parts: renderParts, profile: renderProfile, details: renderDetails, payment: renderPayment }[id];
  if (render) render();
  window.scrollTo(0, 0);
}
// Looks like a phone SMS notification (used by the free demo OTP)
function showSms(message) {
  $("banner").innerHTML = "<small><img class='ic' src='images/icons/speech_balloon.png' alt=''> Messages • now</small><br><b>EV CARE</b><br>" + message;
  $("banner").classList.add("show");
  setTimeout(() => $("banner").classList.remove("show"), 7000);
}
function showBanner(text) {
  $("banner").textContent = text; $("banner").classList.add("show");
  setTimeout(() => $("banner").classList.remove("show"), 4000);
}

// ---- Login with OTP ----
// If Firebase is filled in (data.js) a REAL SMS is sent (6 digits). Otherwise demo mode (4 digits).
let confirmation = null, recaptcha = null, demoCode = "";   // demoCode = the random OTP in free demo mode
function firebaseReady() { return APP_DATA.firebaseConfig.apiKey !== ""; }
function buildOtpBoxes() {
  const n = firebaseReady() ? 6 : 4;
  $("otpInputs").innerHTML = "<input maxlength='1' inputmode='numeric'>".repeat(n);
  const boxes = [...document.querySelectorAll("#otpInputs input")];
  boxes.forEach((b, i) => b.addEventListener("input", () => { if (b.value && boxes[i + 1]) boxes[i + 1].focus(); }));
  $("otpHint").textContent = "Enter the " + n + "-digit OTP";
}
async function getOtp() {
  const phone = $("phone").value;
  if ($("userName").value.trim().length < 2) return showBanner("Enter your name");
  if (!/^\d{10}$/.test(phone)) return showBanner("Enter a 10-digit number");
  buildOtpBoxes();
  if (!firebaseReady()) {                       // demo mode
    demoCode = String(Math.floor(1000 + Math.random() * 9000));   // new random 4-digit OTP every time
    showSms(demoCode + " is your EV CARE login OTP. Do not share it with anyone.");
    $("otpBox").style.display = "block"; return;
  }
  try {                                         // real SMS
    if (!firebase.apps.length) firebase.initializeApp(APP_DATA.firebaseConfig);
    if (!recaptcha) recaptcha = new firebase.auth.RecaptchaVerifier("recaptcha-container", { size: "invisible" });
    confirmation = await firebase.auth().signInWithPhoneNumber("+91" + phone, recaptcha);
    showBanner("OTP sent by SMS to +91 " + phone);
    $("otpBox").style.display = "block";
  } catch (err) {
    showBanner("Could not send OTP: " + err.message);
    if (recaptcha) { recaptcha.clear(); recaptcha = null; }
  }
}
async function verifyOtp() {
  const code = [...document.querySelectorAll("#otpInputs input")].map(i => i.value).join("");
  if (!firebaseReady()) return code === demoCode ? doLogin() : showBanner("Wrong OTP, try again");
  try { await confirmation.confirm(code); doLogin(); }
  catch (err) { showBanner("Wrong OTP, try again"); }
}
function doLogin() {
  const name = $("userName").value.trim(), phone = $("phone").value;
  if (name.length < 2) return showBanner("Enter your name");
  if (!/^\d{10}$/.test(phone)) return showBanner("Enter a 10-digit phone number");
  loadUser(phone, name); show("home");
}

// ---- Home and scooter ----
function renderHome() {
  $("hello").textContent = "Hello, " + state.name.split(" ")[0] + "!";
  $("scName").textContent = state.scooter ? state.scooter.brand + " " + state.scooter.model : "No scooter added yet";
  $("scReg").textContent = state.scooter ? "Reg: " + state.scooter.reg : "Tap Add / Edit Scooter below";
}
function fillScooterForm() {
  const sc = state.scooter || { brand: "", model: "", reg: "", date: "" };
  $("fBrand").value = sc.brand; $("fModel").value = sc.model; $("fReg").value = sc.reg; $("fDate").value = sc.date;
}
function saveScooter() {
  state.scooter = { brand: $("fBrand").value, model: $("fModel").value, reg: $("fReg").value, date: $("fDate").value };
  save(); showBanner("Vehicle saved"); show("home");
}

// ---- 4-step booking wizard ----
function startBooking(mode) { draft = { mode: mode, serviceId: "", problem: "", date: "", slot: "" }; step = 1; show("booking"); renderStep(); }
let calMonth = new Date(); calMonth.setDate(1);
function renderStep() {
  const titles = ["Select Service Type", "Describe the Problem", "Choose Service Mode", "Select Date & Time"];
  $("stepTitle").textContent = titles[step - 1];
  $("nextBtn").textContent = step === 4 ? "Confirm Booking" : "Next";
  // progress circles (shown for steps 2-4): Problem, Mode, Date, Confirm
  const names = ["Problem", "Mode", "Date", "Confirm"];
  $("prog").style.display = step === 1 ? "none" : "flex";
  $("prog").innerHTML = names.map((n, i) => `<div class="${i <= step - 2 ? "on" : ""}"><i>${i + 1}</i>${n}</div>`).join("");
  let html = "";
  if (step === 1) {
    APP_DATA.services.forEach(s => html += `<div class="card choice ${draft.serviceId === s.id ? "sel" : ""}" onclick="draft.serviceId='${s.id}';renderStep()"><div class="ico" style="margin:0"><img src="${s.icon === "tyre" ? "images/parts/tyre.svg" : "images/icons/" + s.icon + ".png"}"></div><span>${s.id === "centre" ? "Or Book at<br>Service Centre" : s.name}</span><b>${s.id === "centre" ? "›" : "₹" + s.price}</b></div>`);
  }
  if (step === 2) html = `<textarea id="problem" rows="4" placeholder="Scooter not starting...">${draft.problem}</textarea>
    <h3>Upload Photos <small>(Optional)</small></h3>
    <label class="card" style="display:block;text-align:center;border:2px dashed #9bb8e8;cursor:pointer"><img src="images/icons/camera.png" alt="" style="width:34px"><br>Add Photos<input type="file" accept="image/*" hidden onchange="previewPhoto(this)"></label>
    <img id="photo" style="max-width:100%;border-radius:10px">`;
  if (step === 3) APP_DATA.modes.forEach(m => html += `<div class="card choice ${draft.mode === m.id ? "sel" : ""}" onclick="draft.mode='${m.id}';renderStep()"><img src="${APP_DATA.images.modes[m.id]}"><span><b style="margin:0">${m.name}</b><br><small>${m.note}</small></span><span class="radio"></span></div>`);
  if (step === 4) html = calendarHtml();
  $("stepBody").innerHTML = html;
}
// Month calendar + time slots (step 4)
function calendarHtml() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let h = `<div class="row between" style="margin-bottom:8px"><button class="link" onclick="moveMonth(-1)">‹</button><b>${calMonth.toLocaleString("en-US", { month: "long" })} ${y}</b><button class="link" onclick="moveMonth(1)">›</button></div><div class="cal">`;
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => h += `<b>${d}</b>`);
  for (let i = 0; i < first; i++) h += "<span></span>";
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d), label = dt.toDateString().slice(4, 10);
    const past = dt < today;
    h += `<span class="${past ? "off" : ""} ${draft.date === label ? "pick" : ""}" ${past ? "" : `onclick="draft.date='${label}';renderStep()"`}>${d}</span>`;
  }
  h += '</div><div class="slots">';
  APP_DATA.slots.forEach(s => h += `<div class="chip ${draft.slot === s ? "sel" : ""}" onclick="draft.slot='${s}';renderStep()">${s}</div>`);
  return h + "</div>";
}
function moveMonth(n) { calMonth.setMonth(calMonth.getMonth() + n); renderStep(); }
function previewPhoto(input) { if (input.files[0]) $("photo").src = URL.createObjectURL(input.files[0]); }
function prevStep() { if (step === 1) show("home"); else { step--; renderStep(); } }
function nextStep() {
  if (step === 2) draft.problem = $("problem").value;
  if (step === 1 && !draft.serviceId) return showBanner("Please select a service");
  if (step === 3 && !draft.mode) return showBanner("Please select a service mode");
  if (step === 4) {
    if (!draft.date || !draft.slot) return showBanner("Pick a date and time");
    const svc = APP_DATA.services.find(s => s.id === draft.serviceId);
    state.current = { id: "#EV" + (123456 + state.bookings.length), name: svc.name, price: svc.price, date: draft.date, slot: draft.slot, status: "Upcoming", paid: false, payment: null };
    state.bookings.unshift(state.current); state.trackStep = 0; save();
    $("bkId").textContent = "Booking ID " + state.current.id; return show("confirm");
  }
  step++; renderStep();
}

// ---- Tracking ----
function startTracking() {
  show("tracking"); drawSteps();
  timer = setInterval(() => { if (state.trackStep < 4) { state.trackStep++; save(); drawSteps(); } }, 3000);
}
function drawSteps() {
  $("steps").innerHTML = APP_DATA.trackSteps.map((t, i) => `<div class="step ${i <= state.trackStep ? "done" : ""}"><i>${i <= state.trackStep ? "✓" : ""}</i><div>${t}<small>${i <= state.trackStep ? APP_DATA.trackTimes[i] : ""}</small></div></div>`).join("");
}

// ---- Technician details ----
function renderDetails() {
  const t = APP_DATA.technician;
  $("techName").textContent = t.name; $("techInfo").innerHTML = '<img class="ic" src="images/icons/star.png" alt=""> ' + t.rating + " (" + t.jobs + " jobs)";
  $("svcName").textContent = state.current ? state.current.name : "Regular Service";
  $("checklist").innerHTML = APP_DATA.checklist.map(c => `<div class="row" style="padding:5px 0"><span><img src="images/icons/check_mark_button.png" alt="" style="width:20px"></span> ${c}</div>`).join("");
  $("estCost").textContent = billTotal();
}
function openChat() { $("chatLog").innerHTML = "<p><b>" + APP_DATA.technician.name + ":</b> Hello! I'm on my way.</p>"; $("modal").classList.add("show"); }
function closeChat() { $("modal").classList.remove("show"); }
function sendChat() {
  const box = $("chatIn"); if (!box.value) return;
  $("chatLog").innerHTML += "<p><b>You:</b> " + box.value.replace(/</g, "&lt;") + "</p>"; box.value = "";
}

// ---- Payment (Amazon-style checkout) ----
function billTotal() { const b = APP_DATA.bill; return b.service + b.parts + b.gst; }
function billHtml() {
  const b = APP_DATA.bill;
  return `<div><span>Service Charge</span><span>₹${b.service}</span></div><div><span>Parts Cost</span><span>₹${b.parts}</span></div>
  <div><span>GST (18%)</span><span>₹${b.gst}</span></div><div class="tot"><span>Total Amount</span><span>₹${billTotal()}</span></div>`;
}
let selectedBank = APP_DATA.banks[0], pendingMethod = "", otpTries = 0, paidMethod = "", paidRef = "";
function renderPayment() {
  $("orderName").textContent = state.current ? state.current.name + " (" + state.current.id + ")" : "Scooter service";
  $("bill").innerHTML = billHtml(); $("payTotal").textContent = billTotal();
  $("payBtn").textContent = "Pay ₹" + billTotal();
  $("upiId").textContent = APP_DATA.upiId;
  $("upiApps").innerHTML = APP_DATA.upiApps.map((app, i) => `<button class="btn alt" onclick="payUpiApp(${i})">${app.name}</button>`).join("");
  drawBanks();
  $("qr").innerHTML = "";
  if (window.QRCode) new QRCode($("qr"), upiLink());
  pickPay(payMethod);
  const alreadyPaid = state.current && state.current.paid;     // never let a paid booking be paid twice
  $("payForm").style.display = alreadyPaid ? "none" : "block";
  $("paidNotice").style.display = alreadyPaid ? "block" : "none";
  if (alreadyPaid) $("paidInfo").textContent = "Paid via " + state.current.payment.method;
}
function drawBanks() {
  $("bankList").innerHTML = APP_DATA.banks.map(b => `<div class="chip bank ${b === selectedBank ? "sel" : ""}" onclick="selectedBank='${b}';drawBanks()">${b}</div>`).join("");
}
function pickPay(method) {
  payMethod = method;
  ["upi", "card", "net", "cash"].forEach(m => $("pm-" + m).classList.toggle("sel", m === method));
}
function copyUpi() { navigator.clipboard.writeText(APP_DATA.upiId); showBanner("UPI ID copied"); }

// Link that opens a UPI app, pre-filled with our UPI ID and amount
function upiLink() {
  const id = state.current ? state.current.id.replace("#", "") : "EV123456";
  return "upi://pay?pa=" + APP_DATA.upiId + "&pn=" + encodeURIComponent("EV CARE") +
    "&am=" + billTotal() + ".00&cu=INR&tn=" + encodeURIComponent("EV CARE " + id);
}
// The big "Pay" button: does the right thing for the chosen method
function payNow() {
  if (state.current && state.current.paid) return showBanner("This booking is already paid");
  if (payMethod === "upi") return startUpi(upiLink());
  if (payMethod === "card") return payByCard();
  if (payMethod === "net") return startProcessing(showBankPage);
  finishPayment("Cash after Service", "");
}

// ---- Popup panes: payAsk, payWait, payOtp, payFail ----
function showPane(id) {
  document.querySelectorAll("#payModal .pane").forEach(p => p.style.display = p.id === id ? "block" : "none");
  $("payModal").classList.add("show");
}
function closePay() { $("payModal").classList.remove("show"); }
function startProcessing(next) { showPane("payWait"); setTimeout(next, 2000); }
function showFail(message) { $("failMsg").textContent = message; showPane("payFail"); }
// ---- Net banking: the customer must authorize the payment on the (demo) bank page ----
function showBankPage() {
  $("bankName").textContent = selectedBank; $("bankAmt").textContent = billTotal(); showPane("payBank");
}
function bankAuthorize() { completePayment("Net Banking - " + selectedBank); }
function bankCancel() { showFail("Payment was cancelled at the bank page. You have not been charged."); }
function newRef() { return "TEST" + Math.floor(10000000 + Math.random() * 90000000); }
function completePayment(method) { startProcessing(() => { closePay(); finishPayment(method, newRef()); }); }

// ---- UPI ----
function payUpiApp(index) { startUpi(upiLink().replace("upi://pay", APP_DATA.upiApps[index].scheme)); }
function startUpi(link) {
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) window.location.href = link;   // opens the UPI app
  else showBanner("Scan the QR code with any UPI app, then confirm here");
  $("utr").value = "";
  setTimeout(() => showPane("payAsk"), 800);
}
function confirmPaid() {
  const ref = $("utr").value.trim();
  if (!/^\d{12}$/.test(ref)) return showBanner("Enter the 12-digit UPI reference number");
  const usedRefs = JSON.parse(localStorage.getItem("evcare_used_refs") || "[]");
  if (/^(\d)\1{11}$/.test(ref) || ref === "123456789012") return showBanner("That is not a valid UPI reference number");
  if (usedRefs.includes(ref)) return showBanner("This reference number was already used");
  usedRefs.push(ref); localStorage.setItem("evcare_used_refs", JSON.stringify(usedRefs));
  recordUpi(ref);
  startProcessing(() => { closePay(); finishPayment("UPI", ref); });
}

// ---- Card (DEMO: the card is only checked here and never saved) ----
function formatCard(box) {
  box.value = box.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const first = box.value[0];
  $("cardType").textContent = first === "4" ? "Visa" : first === "5" ? "Mastercard" : (first === "6" || first === "8") ? "RuPay" : "";
}
function formatExp(box) {
  let v = box.value.replace(/\D/g, "").slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  box.value = v;
}
function luhnOk(num) {            // standard card-number check
  let sum = 0, double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n; double = !double;
  }
  return sum % 10 === 0;
}
function expiryOk(text) {
  const m = /^(\d{2})\/(\d{2})$/.exec(text);
  if (!m || m[1] < 1 || m[1] > 12) return false;
  return new Date(2000 + Number(m[2]), Number(m[1]), 1) > new Date();
}
function payByCard() {
  const number = $("cNum").value.replace(/\s/g, "");
  if (number.length !== 16 || !luhnOk(number)) return showBanner("Enter a valid 16-digit card number");
  if ($("cName").value.trim() === "") return showBanner("Enter the name on the card");
  if (!expiryOk($("cExp").value)) return showBanner("Enter a valid expiry date (MM/YY)");
  if (!/^\d{3}$/.test($("cCvv").value)) return showBanner("Enter the 3-digit CVV");
  const method = "Card ending " + number.slice(-4);
  if (number === "4000000000000002") return startProcessing(() => showFail("Your card was declined by the bank."));
  startProcessing(() => {                        // then the bank asks for an OTP, like a real card payment
    pendingMethod = method; otpTries = 0; $("cardOtp").value = "";
    $("otpFor").textContent = "Enter the OTP sent by your bank to confirm ₹" + billTotal() + " (demo OTP: " + APP_DATA.demoCardOtp + ")";
    showPane("payOtp");
  });
}
function verifyCardOtp() {
  if ($("cardOtp").value === APP_DATA.demoCardOtp) {
    ["cNum", "cName", "cExp", "cCvv"].forEach(id => $(id).value = "");
    return startProcessing(() => { closePay(); finishPayment(pendingMethod, newRef()); });
  }
  otpTries++;
  if (otpTries >= 3) return showFail("Too many wrong OTP attempts.");
  showBanner("Incorrect OTP. Try again (" + (3 - otpTries) + " left)");
}

// ---- Talking to the Flask server ----
async function api(path, body) {
  const response = await fetch(APP_DATA.serverUrl + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Server error");
  return data;
}
function bookingId() { return state.current ? state.current.id : "EV123456"; }
// Best effort: tell the server about a UPI payment (it saves it as "pending verification")
async function recordUpi(reference) {
  try { const order = await api("/api/orders", { booking_id: bookingId() }); await api("/api/pay/upi", { order_id: order.order_id, reference }); }
  catch (err) { /* server not running: the UPI flow still works without it */ }
}

// Google Pay button: server creates the order -> Google Pay sheet -> server confirms the payment.
async function payWithGooglePay() {
  if (!window.google || !google.payments) return showBanner("Google Pay could not load. Check your internet.");
  let order;
  try { order = await api("/api/orders", { booking_id: bookingId() }); }
  catch (err) { return showBanner("Start the EV CARE server first (see server/README.md)"); }
  const gp = APP_DATA.googlePay;
  const base = { apiVersion: 2, apiVersionMinor: 0 };
  const cardMethod = {
    type: "CARD",
    parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["MASTERCARD", "VISA"] },
    tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: gp.gateway, gatewayMerchantId: gp.gatewayMerchantId } }
  };
  const client = new google.payments.api.PaymentsClient({ environment: gp.environment });
  try {
    const ready = await client.isReadyToPay({ ...base, allowedPaymentMethods: [cardMethod] });
    if (!ready.result) return showBanner("Google Pay is not available on this device or browser");
    const paymentData = await client.loadPaymentData({
      ...base, allowedPaymentMethods: [cardMethod],
      merchantInfo: { merchantName: gp.merchantName, merchantId: gp.merchantId },
      transactionInfo: { totalPriceStatus: "FINAL", totalPrice: String(order.amount), currencyCode: "INR", countryCode: "IN" }
    });
    showPane("payWait");
    const token = paymentData.paymentMethodData.tokenizationData.token;
    const result = await api("/api/pay/googlepay", { order_id: order.order_id, token });
    closePay(); finishPayment("Google Pay", result.payment_ref);
  } catch (err) {
    closePay();
    if (err.statusCode !== "CANCELED") showFail(err.message || "Google Pay payment failed");
  }
}

// ---- Invoice ----
// Called only when a payment really went through (or the customer chose cash on service)
function finishPayment(method, ref) {
  const paid = method !== "Cash after Service";          // cash is NOT paid yet
  if (state.current) {
    state.current.paid = paid;
    state.current.payment = { method: method, ref: ref };
    state.current.status = paid ? "Paid" : "Payment due";
    save();
  }
  renderInvoice(method, ref, paid); show("invoice");
}
function viewInvoice() { const p = state.current.payment; renderInvoice(p.method, p.ref, true); show("invoice"); }
function renderInvoice(method, ref, paid) {
  paidMethod = method; paidRef = ref;
  $("invTitle").textContent = paid ? "Payment Successful!" : "Pay ₹" + billTotal() + " in cash on service";
  $("invIcon").src = paid ? "images/icons/check_mark_button.png" : "images/icons/clipboard.png";
  const extra = `<div><span>${paid ? "Paid via" : "Payment method"}</span><span>${method}</span></div>` + (ref ? `<div><span>Payment Ref</span><span>${ref}</span></div>` : "");
  $("invBody").innerHTML = billHtml().replace("Total Amount", paid ? "Total Paid" : "Total Due") + extra;
  $("invDate").textContent = "Date: " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function invoiceText() {
  return "EV CARE Invoice\nInvoice No: INV789456\nPaid via: " + paidMethod + (paidRef ? "\nPayment Ref: " + paidRef : "") + "\nTotal: Rs " + billTotal();
}
function downloadInvoice() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([invoiceText()], { type: "text/plain" }));
  a.download = "INV789456.txt"; a.click();
}
function shareInvoice() {
  if (navigator.share) navigator.share({ title: "EV CARE Invoice", text: invoiceText() });
  else { navigator.clipboard.writeText(invoiceText()); showBanner("Invoice copied to clipboard"); }
}

// ---- Bookings tab ----
function badgeStyle(status) {
  if (status === "Upcoming") return "background:#dbeafe;color:#1d4ed8";
  if (status === "Payment due") return "background:#fef3c7;color:#b45309";
  return "";                                   // green (Paid)
}
function renderBookings() {
  const all = state.bookings;
  if (all.length === 0) { $("bkList").innerHTML = '<div class="card" style="text-align:center">No bookings yet. Book your first service from Home.</div>'; return; }
  $("bkList").innerHTML = all.map(b => `<div class="card row between"><div class="row"><div class="ico" style="margin:0"><img src="images/icons/wrench.png" alt=""></div><div><b>${b.name}</b><br><small>${b.date}</small></div></div><span class="badge" style="${badgeStyle(b.status)}">${b.status}</span></div>`).join("");
}

// ---- Parts tab ----
function renderParts() {
  $("cartCount").innerHTML = '<img class="ic" src="images/icons/shopping_cart.png" alt=""> ' + state.cart;
  $("partFilters").innerHTML = ["All", "Battery", "Tyres", "Parts"].map(f => `<div class="chip ${partFilter === f ? "sel" : ""}" style="min-width:0" onclick="partFilter='${f}';renderParts()">${f}</div>`).join("");
  $("partList").innerHTML = APP_DATA.parts.filter(p => partFilter === "All" || p.type === partFilter)
    .map(p => `<div class="card row between"><div class="row">${p.img ? `<img class="pt" src="${p.img}">` : `<div class="ico" style="margin:0"><img src="images/icons/gear.png" alt=""></div>`}<div><b>${p.name}</b><br>₹${p.price.toLocaleString("en-IN")}</div></div><button class="chip" style="flex:none;min-width:0;background:var(--blue);color:#fff" onclick="state.cart++;save();renderParts()">Add +</button></div>`).join("");
}

// ---- SOS ----
function shareLocation() {
  if (!navigator.geolocation) return showBanner("Location not supported");
  navigator.geolocation.getCurrentPosition(
    p => showBanner("Location shared: " + p.coords.latitude.toFixed(3) + ", " + p.coords.longitude.toFixed(3)),
    () => showBanner("Please allow location access"));
}

// ---- Profile ----
function renderProfile() {
  $("pName").textContent = state.name; $("avatar").textContent = state.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); $("pPhone").textContent = prettyPhone();
  const links = ["My Scooters", ...Object.keys(APP_DATA.info), "Logout"];
  $("pLinks").innerHTML = links.map(l => `<div class="card choice" style="${l === "Logout" ? "color:var(--red)" : ""}" onclick="openLink('${l}')">${l} <b>›</b></div>`).join("");
}
function openLink(name) {
  if (name === "My Scooters") return show("addScooter");
  if (name === "Logout") { logout(); $("userName").value = ""; $("phone").value = ""; $("otpBox").style.display = "none"; return show("login"); }
  $("infoTitle").textContent = name; $("infoText").textContent = APP_DATA.info[name]; show("info");
}

// ---- Start: splash, then onboarding (or home if already logged in) ----
// Put every picture in place from data.js (<img data-img="name">)
document.querySelectorAll("[data-img]").forEach(i => i.src = APP_DATA.images[i.dataset.img]);
show("splash");
setTimeout(() => show(state.loggedIn ? "home" : "onboarding"), 2500);
