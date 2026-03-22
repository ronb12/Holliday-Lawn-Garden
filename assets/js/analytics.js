import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyACm0j7I8RX4ExIQRoejfk1HZMOQRGigBw",
    authDomain: "holiday-lawn-and-garden.firebaseapp.com",
    projectId: "holiday-lawn-and-garden",
    storageBucket: "holiday-lawn-and-garden.firebasestorage.app",
    messagingSenderId: "135322230444",
    appId: "1:135322230444:web:1a487b25a48aae07368909"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const data   = { payments: [], appointments: [], customers: [] };
const loaded = { payments: false, appointments: false, customers: false };

// Auth check
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'admin-login.html'; return; }
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            startListeners();
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (e) {
        window.location.href = 'admin-login.html';
    }
});

function startListeners() {
    onSnapshot(collection(db, 'payments'), snap => {
        data.payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        loaded.payments = true;
        render();
    });
    onSnapshot(collection(db, 'appointments'), snap => {
        data.appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        loaded.appointments = true;
        render();
    });
    onSnapshot(collection(db, 'customers'), snap => {
        data.customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        loaded.customers = true;
        render();
    });
}

function render() {
    if (!loaded.payments || !loaded.appointments || !loaded.customers) return;
    renderStats();
    renderMetrics();
    renderCharts();
}

// ── Stats ──────────────────────────────────────────────────────
function renderStats() {
    const totalRevenue = data.payments.reduce((s, p) => s + (p.amount || 0), 0);
    setText('total-revenue',      `$${totalRevenue.toFixed(2)}`);
    setText('total-appointments', data.appointments.length);
    setText('total-customers',    data.customers.length);
}

// ── Metrics ────────────────────────────────────────────────────
function renderMetrics() {
    const now       = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear  = thisMonth === 0 ? thisYear - 1 : thisYear;

    // Revenue growth: this vs last month
    const revThis = sumPayments(thisMonth, thisYear);
    const revLast = sumPayments(lastMonth, lastYear);
    if (revThis === 0 && revLast === 0) {
        setText('revenue-growth', '—');
        setText('revenue-growth-change', 'No payment data yet');
    } else {
        const pct  = revLast === 0 ? 100 : ((revThis - revLast) / revLast * 100);
        const sign = pct >= 0 ? '+' : '';
        setText('revenue-growth', `${sign}${pct.toFixed(1)}%`);
        setText('revenue-growth-change', `${pct >= 0 ? '↑' : '↓'} vs last month`);
    }

    // New customers this month
    const newCust = data.customers.filter(c => {
        const d = toDate(c.createdAt);
        return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    setText('customer-acquisition', newCust);
    setText('customer-acquisition-change', `${newCust} new customer${newCust !== 1 ? 's' : ''} this month`);

    // Appointment completion rate
    const total     = data.appointments.length;
    const completed = data.appointments.filter(a => a.status === 'completed').length;
    if (total === 0) {
        setText('appointment-completion', '—');
        setText('appointment-completion-change', 'No appointments yet');
    } else {
        const rate = ((completed / total) * 100).toFixed(1);
        setText('appointment-completion', `${rate}%`);
        setText('appointment-completion-change', `${completed} of ${total} completed`);
    }

    // This month revenue
    setText('customer-satisfaction', `$${revThis.toFixed(2)}`);
    setText('customer-satisfaction-change', now.toLocaleString('default', { month: 'long', year: 'numeric' }));
}

function sumPayments(month, year) {
    return data.payments.filter(p => {
        const d = toDate(p.createdAt);
        return d && d.getMonth() === month && d.getFullYear() === year;
    }).reduce((s, p) => s + (p.amount || 0), 0);
}

// ── Charts ─────────────────────────────────────────────────────
function renderCharts() {
    renderBarChart('chart-revenue',   getMonthly(data.payments, 'amount'), '#4CAF50', v => `$${v.toFixed(0)}`);
    renderBarChart('chart-appts',     getMonthly(data.appointments, 'count'), '#2196F3', v => v);
    renderBarChart('chart-customers', getMonthly(data.customers, 'count'), '#9C27B0', v => v);
    renderServiceChart();
}

function renderBarChart(id, months, color, fmt) {
    const el = document.getElementById(id);
    if (!el) return;
    const max     = Math.max(...months.map(m => m.value), 1);
    const hasData = months.some(m => m.value > 0);

    if (!hasData) {
        el.innerHTML = `<div style="text-align:center;padding:2rem;color:#aaa;"><i class="fas fa-chart-bar fa-2x" style="margin-bottom:0.75rem;display:block;color:#ddd;"></i>No data yet</div>`;
        return;
    }

    el.innerHTML = `
        <div style="padding:1rem 1.5rem;">
            <div style="display:flex;justify-content:space-around;align-items:flex-end;height:160px;gap:6px;">
                ${months.map(m => `
                    <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                        <div style="font-size:0.65rem;color:#555;margin-bottom:2px;">${m.value > 0 ? fmt(m.value) : ''}</div>
                        <div style="background:${color};width:100%;height:${Math.max(4, (m.value / max) * 130)}px;border-radius:4px 4px 0 0;opacity:0.8;"></div>
                        <div style="font-size:0.7rem;margin-top:4px;color:#666;">${m.label}</div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function renderServiceChart() {
    const el = document.getElementById('chart-services');
    if (!el) return;
    const counts = {};
    data.appointments.forEach(a => {
        const svc = a.serviceType || a.service || 'General';
        counts[svc] = (counts[svc] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
        el.innerHTML = `<div style="text-align:center;padding:2rem;color:#aaa;"><i class="fas fa-chart-pie fa-2x" style="margin-bottom:0.75rem;display:block;color:#ddd;"></i>No appointment data yet</div>`;
        return;
    }
    const total  = entries.reduce((s, [, c]) => s + c, 0);
    const colors = ['#4CAF50','#2196F3','#FF9800','#9C27B0','#F44336','#00BCD4'];
    el.innerHTML = `<div style="padding:1rem 1.5rem;">${entries.map(([svc, cnt], i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #f0f0f0;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <div style="width:12px;height:12px;border-radius:50%;background:${colors[i % colors.length]};flex-shrink:0;"></div>
                <span style="font-size:0.9rem;">${svc}</span>
            </div>
            <span style="font-weight:600;font-size:0.9rem;">${cnt} <span style="font-weight:400;color:#888;">(${(cnt/total*100).toFixed(0)}%)</span></span>
        </div>`).join('')}</div>`;
}

function getMonthly(items, type) {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
        const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const value = type === 'amount'
            ? items.filter(x => { const xd = toDate(x.createdAt); return xd && xd.getMonth() === d.getMonth() && xd.getFullYear() === d.getFullYear(); }).reduce((s, x) => s + (x.amount || 0), 0)
            : items.filter(x => { const xd = toDate(x.createdAt); return xd && xd.getMonth() === d.getMonth() && xd.getFullYear() === d.getFullYear(); }).length;
        return { label, value };
    });
}

// ── Helpers ────────────────────────────────────────────────────
function toDate(v) {
    if (!v) return null;
    if (v.toDate) return v.toDate();
    const d = new Date(v);
    return isNaN(d) ? null : d;
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

window.refreshAnalytics = () => startListeners();
window.logout = async () => { await signOut(auth); window.location.href = 'admin-login.html'; };
