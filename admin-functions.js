// ✅ Firebase Initialization
const firebaseConfig = {
  apiKey: "AIzaSyDrdga_hOO52nicYN3AwqqDjSbcnre6iM4",
  authDomain: "mobile-debt-crusher.firebaseapp.com",
  projectId: "mobile-debt-crusher"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ✅ Utility Functions
function showLoader() {
  document.getElementById("loadingOverlay").style.display = "flex";
}
function hideLoader() {
  document.getElementById("loadingOverlay").style.display = "none";
}
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "on" : "off");
}
function showTab(id) {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  updateDashboardStats();
}
window.onload = () => {
  if (localStorage.getItem("darkMode") === "on") document.body.classList.add("dark");
  loadCustomersDropdown();
  updateDashboardStats();
};

// ✅ Customer Dropdown
function loadCustomersDropdown() {
  const ids = ["requestCustomer", "quoteCustomer", "invoiceCustomer"];
  ids.forEach(id => {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="">Select Customer</option>';
    db.collection("customers").get().then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.text = data.name || data.email || "Unnamed Customer";
        dropdown.appendChild(option);
      });
    });
  });
}

// ✅ Submit Request
function submitRequest(e) {
  e.preventDefault();
  const customerUID = document.getElementById("requestCustomer").value;
  const description = document.getElementById("requestDescription").value;
  const ref = db.collection("customers").doc(customerUID);
  ref.get().then(doc => {
    const name = doc.data().name || "Customer";
    ref.collection("requests").add({ customer: name, description, status: "Pending", createdAt: new Date(), fromAdmin: true });
    db.collection("requests").add({ customer: name, description, status: "Pending", createdAt: new Date() });
    e.target.reset(); loadRequests();
  });
}

// ✅ Submit Quote
function submitQuote(e) {
  e.preventDefault();
  const customerUID = document.getElementById("quoteCustomer").value;
  const amount = parseFloat(document.getElementById("quoteAmount").value);
  const ref = db.collection("customers").doc(customerUID);
  ref.get().then(doc => {
    const name = doc.data().name || "Customer";
    ref.collection("quotes").add({ customer: name, amount, status: "Pending", createdAt: new Date() });
    db.collection("quotes").add({ customer: name, amount, status: "Pending", createdAt: new Date() });
    e.target.reset(); loadQuotes();
  });
}

// ✅ Smart Quote Calculator
function calculateQuote(e) {
  e.preventDefault();
  const job = document.getElementById("jobDesc").value;
  const material = parseFloat(document.getElementById("materialCost").value);
  const hours = parseFloat(document.getElementById("laborHours").value);
  const rate = parseFloat(document.getElementById("hourlyRate").value);
  const fuel = parseFloat(document.getElementById("fuelCost").value);
  const margin = parseFloat(document.getElementById("profitMargin").value);
  const labor = hours * rate;
  const baseCost = material + labor + fuel;
  const recommended = baseCost * (1 + margin / 100);
  document.getElementById("quoteResult").innerText = `Recommended Quote: $${recommended.toFixed(2)} (Base: $${baseCost.toFixed(2)}, Margin: ${margin}%)`;
  document.getElementById("quoteAmount").value = recommended.toFixed(2);
  db.collection("smartQuotes").add({ job, materialCost: material, laborCost: labor, fuelCost: fuel, baseCost, profitMargin: margin, recommendedQuote: recommended, createdAt: new Date() });
  loadRecentSmartQuotes();
}

function loadRecentSmartQuotes() {
  const tbody = document.querySelector("#recentSmartQuotes tbody");
  tbody.innerHTML = "";
  db.collection("smartQuotes").orderBy("createdAt", "desc").limit(5).get().then(snapshot => {
    snapshot.forEach(doc => {
      const d = doc.data();
      const margin = ((d.recommendedQuote - d.baseCost) / d.baseCost * 100).toFixed(1);
      const date = new Date(d.createdAt.toDate()).toLocaleDateString();
      tbody.innerHTML += `<tr><td>${d.job}</td><td>$${d.baseCost.toFixed(2)}</td><td>$${d.recommendedQuote.toFixed(2)}</td><td>${margin}%</td><td>${date}</td></tr>`;
    });
  });
}

// ✅ Submit Invoice
function submitInvoice(e) {
  e.preventDefault();
  const customerUID = document.getElementById("invoiceCustomer").value;
  const amount = parseFloat(document.getElementById("invoiceAmount").value);
  const dueDate = document.getElementById("invoiceDueDate").value;
  const ref = db.collection("customers").doc(customerUID);
  ref.get().then(doc => {
    const name = doc.data().name || "Customer";
    ref.collection("invoices").add({ customer: name, amount, dueDate, paid: false, createdAt: new Date() });
    db.collection("invoices").add({ customer: name, amount, dueDate, paid: false, createdAt: new Date() });
    e.target.reset(); loadInvoices();
  });
}

// ✅ Expense Tracking
function submitExpense(e) {
  e.preventDefault();
  const desc = document.getElementById("expenseDesc").value;
  const amount = parseFloat(document.getElementById("expenseAmount").value);
  const date = document.getElementById("expenseDate").value;
  db.collection("expenses").add({ description: desc, amount, date, createdAt: new Date() })
    .then(() => { e.target.reset(); loadExpenses(); updateDashboardStats(); });
}
function loadExpenses() {
  const tbody = document.querySelector("#expensesTable tbody");
  showLoader();
  db.collection("expenses").orderBy("date", "desc").get().then(snapshot => {
    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const d = doc.data();
      tbody.innerHTML += `<tr><td>${d.description}</td><td>$${d.amount.toFixed(2)}</td><td>${d.date}</td><td><button onclick="deleteExpense('${doc.id}')">❌</button></td></tr>`;
    });
    hideLoader();
  });
}
function deleteExpense(id) {
  db.collection("expenses").doc(id).delete().then(() => { loadExpenses(); updateDashboardStats(); });
}

// ✅ Dashboard Stats
function updateDashboardStats() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  let mp = 0, yp = 0, td = 0, ti = 0, em = 0, ey = 0;
  db.collection("requests").get().then(snap => {
    document.getElementById("statRequests").innerText = `📝 Requests: ${snap.size}`;
  });
  db.collection("quotes").get().then(snap => {
    document.getElementById("statQuotes").innerText = `💬 Quotes: ${snap.size}`;
  });
  db.collection("invoices").get().then(snap => {
    snap.forEach(doc => {
      const d = doc.data();
      const dt = d.createdAt.toDate();
      ti++;
      if (!d.paid) td += d.amount;
      if (d.paid && dt.getFullYear() === y) {
        yp += d.amount;
        if (dt.getMonth() === m) mp += d.amount;
      }
    });
    document.getElementById("statInvoices").innerText = `💰 Invoices: ${ti}`;
    document.getElementById("statTotalDue").innerText = `📉 Total Due: $${td.toFixed(2)}`;
    db.collection("expenses").get().then(snap => {
      snap.forEach(doc => {
        const d = doc.data(), dt = new Date(d.date);
        if (dt.getFullYear() === y) {
          ey += d.amount;
          if (dt.getMonth() === m) em += d.amount;
        }
      });
      document.getElementById("statMonthlyProfit").innerText = `📆 This Month: $${mp.toFixed(2)} | Net: $${(mp - em).toFixed(2)}`;
      document.getElementById("statYearlyProfit").innerText = `📈 This Year: $${yp.toFixed(2)} | Net: $${(yp - ey).toFixed(2)}`;
    });
  });
}

// ✅ Table Utils
function filterTable(tableId, query) {
  const table = document.getElementById(tableId);
  const rows = table.querySelectorAll("tbody tr");
  const f = query.toLowerCase();
  rows.forEach(row => row.style.display = row.innerText.toLowerCase().includes(f) ? "" : "none");
}
function sortTable(tableId, col) {
  const table = document.getElementById(tableId);
  const rows = Array.from(table.tBodies[0].rows);
  const dir = table.getAttribute(`data-sort-${col}`) === "asc" ? "desc" : "asc";
  rows.sort((a, b) => {
    const A = a.cells[col].innerText.trim(), B = b.cells[col].innerText.trim();
    const aVal = isNaN(A) ? A.toLowerCase() : parseFloat(A);
    const bVal = isNaN(B) ? B.toLowerCase() : parseFloat(B);
    return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * (dir === "asc" ? 1 : -1);
  });
  rows.forEach(r => table.tBodies[0].appendChild(r));
  table.setAttribute(`data-sort-${col}`, dir);
}
function exportTableToCSV(tableId, filename) {
  const rows = [...document.querySelectorAll(`#${tableId} tr`)];
  const csv = rows.map(row => [...row.cells].map(cell => `"${cell.innerText}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
function exportTableToPDF(tableId, title) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rows = [...document.querySelectorAll(`#${tableId} tr`)];
  let y = 20;
  doc.setFontSize(16); doc.text(title, 14, y);
  y += 10;
  doc.setFontSize(10);
  rows.forEach(row => {
    let x = 14;
    [...row.cells].forEach(cell => {
      doc.text(cell.innerText, x, y);
      x += 40;
    });
    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  doc.save(`${title}.pdf`);
}
