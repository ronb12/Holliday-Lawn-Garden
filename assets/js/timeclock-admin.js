import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, addDoc, updateDoc, deleteDoc,
    doc, query, where, orderBy, getDocs, getDoc, setDoc,
    onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyACm0j7I8RX4ExIQRoejfk1HZMOQRGigBw",
    authDomain: "holiday-lawn-and-garden.firebaseapp.com",
    projectId: "holiday-lawn-and-garden",
    storageBucket: "holiday-lawn-and-garden.firebasestorage.app",
    messagingSenderId: "135322230444",
    appId: "1:135322230444:web:1a487b25a48aae07368909"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

let allEntries   = [];
let allStaff     = [];
let payRates     = {};   // staffId -> hourlyRate
let filteredEntries = [];

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'admin-login.html'; return; }
    const userDoc = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
    if (!userDoc || !userDoc.exists() || userDoc.data().role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }
    await Promise.all([loadStaff(), loadPayRates()]);
    loadEntries();
    listenForActiveSessions();
});

// ── Load staff ────────────────────────────────────────────────────────────────
async function loadStaff() {
    const snap = await getDocs(collection(db, 'staff'));
    allStaff = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    populateStaffFilter();
    renderPayRatesPanel();
}

function populateStaffFilter() {
    const sel = document.getElementById('filterStaff');
    allStaff.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name || s.email || s.id;
        sel.appendChild(opt);
    });
}

// ── Pay rates ─────────────────────────────────────────────────────────────────
async function loadPayRates() {
    const snap = await getDocs(collection(db, 'staffPayRates'));
    payRates = {};
    snap.docs.forEach(d => { payRates[d.id] = d.data().hourlyRate; });
}

function renderPayRatesPanel() {
    const grid = document.getElementById('payRatesGrid');
    if (!allStaff.length) {
        grid.innerHTML = '<div class="no-data" style="grid-column:1/-1;padding:1rem;">No staff found.</div>';
        return;
    }
    grid.innerHTML = allStaff.map(s => `
        <div class="pay-row" id="payrow-${s.id}">
            <span class="pay-staff-name"><i class="fas fa-user" style="color:#4caf50;margin-right:0.4rem;"></i>${s.name || s.email || s.id}</span>
            <div class="pay-input-wrap">
                <span>$</span>
                <input class="pay-input" type="number" min="0" step="0.01"
                    id="rate-${s.id}"
                    value="${payRates[s.id] != null ? parseFloat(payRates[s.id]).toFixed(2) : ''}"
                    placeholder="0.00"/>
                <span style="color:#888;font-size:0.85rem;">/hr</span>
            </div>
            <button class="pay-save-btn" onclick="savePayRate('${s.id}')">Save</button>
            <span class="pay-saved" id="saved-${s.id}"><i class="fas fa-check"></i> Saved</span>
        </div>`).join('');
}

window.savePayRate = async function (staffId) {
    const input = document.getElementById(`rate-${staffId}`);
    const rate  = parseFloat(input.value);
    if (isNaN(rate) || rate < 0) { showMsg('Enter a valid hourly rate.', 'error'); return; }

    await setDoc(doc(db, 'staffPayRates', staffId), { hourlyRate: rate, updatedAt: serverTimestamp() });
    payRates[staffId] = rate;

    const savedEl = document.getElementById(`saved-${staffId}`);
    savedEl.style.display = 'inline-flex';
    setTimeout(() => { savedEl.style.display = 'none'; }, 2500);

    // Refresh summaries if visible
    renderSummaryTab();
    updateStatCards();
};

// ── Load entries ──────────────────────────────────────────────────────────────
async function loadEntries() {
    const period = document.getElementById('filterPeriod').value;
    const since  = periodStart(period);

    let q;
    if (since) {
        q = query(collection(db, 'timeclock'), where('date', '>=', since), orderBy('date', 'desc'));
    } else {
        q = query(collection(db, 'timeclock'), orderBy('date', 'desc'));
    }

    const snap = await getDocs(q);
    allEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilters();
}

function periodStart(period) {
    const now = new Date();
    if (period === 'today')  { return now.toISOString().split('T')[0]; }
    if (period === 'week')   { const d = new Date(now); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; }
    if (period === 'biweek') { const d = new Date(now); d.setDate(d.getDate() - 13); return d.toISOString().split('T')[0]; }
    if (period === 'month')  { return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; }
    return null;
}

// ── Filters ───────────────────────────────────────────────────────────────────
window.applyFilters = function () {
    loadEntries();
};

function filterLocally(entries) {
    const staffFilter  = document.getElementById('filterStaff').value;
    const statusFilter = document.getElementById('filterStatus').value;
    return entries.filter(e => {
        if (staffFilter  && e.staffId !== staffFilter)                          return false;
        if (statusFilter === 'in'  && e.clockOut !== null)                      return false;
        if (statusFilter === 'out' && (e.clockOut === null || !e.clockOut))     return false;
        return true;
    });
}

// ── Render entries table ──────────────────────────────────────────────────────
function renderEntriesTable(entries) {
    const body = document.getElementById('entriesTableBody');
    if (!entries.length) {
        body.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-clock"></i> No entries found.</td></tr>';
        return;
    }
    body.innerHTML = entries.map(e => {
        const inTime  = e.clockIn  ? tsToDate(e.clockIn)  : null;
        const outTime = e.clockOut ? tsToDate(e.clockOut) : null;
        const isActive = !outTime;
        return `<tr>
            <td><i class="fas fa-user" style="color:#4caf50;margin-right:0.4rem;"></i>${e.staffName || e.staffId}</td>
            <td>${e.date}</td>
            <td>${inTime  ? inTime.toLocaleTimeString()  : '--'}</td>
            <td>${outTime ? outTime.toLocaleTimeString() : '--'}</td>
            <td>${e.totalMinutes != null ? formatMinutes(e.totalMinutes) : (isActive ? '<em style="color:#888;">In progress</em>' : '--')}</td>
            <td><span class="badge ${isActive ? 'badge-in' : 'badge-out'}">
                ${isActive ? '<i class="fas fa-circle"></i> Clocked In' : '<i class="fas fa-check"></i> Complete'}
            </span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openEditModal('${e.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── Pay summary tab ───────────────────────────────────────────────────────────
function renderSummaryTab() {
    const entries = filterLocally(allEntries).filter(e => e.totalMinutes != null);
    const body    = document.getElementById('summaryTableBody');

    // Group by staff
    const byStaff = {};
    entries.forEach(e => {
        if (!byStaff[e.staffId]) byStaff[e.staffId] = { name: e.staffName || e.staffId, minutes: 0, shifts: 0 };
        byStaff[e.staffId].minutes += e.totalMinutes;
        byStaff[e.staffId].shifts++;
    });

    if (!Object.keys(byStaff).length) {
        body.innerHTML = '<tr><td colspan="5" class="no-data">No completed shifts in this period.</td></tr>';
        return;
    }

    body.innerHTML = Object.entries(byStaff).map(([staffId, data]) => {
        const hours = data.minutes / 60;
        const rate  = payRates[staffId];
        const pay   = rate != null ? (hours * rate).toFixed(2) : null;
        return `<tr>
            <td><i class="fas fa-user" style="color:#4caf50;margin-right:0.4rem;"></i>${data.name}</td>
            <td><strong>${hours.toFixed(2)}</strong> hrs</td>
            <td>${rate != null ? '$' + parseFloat(rate).toFixed(2) + '/hr' : '<span style="color:#ef5350;">Not set</span>'}</td>
            <td class="earnings-highlight">${pay != null ? '$' + pay : '--'}</td>
            <td>${data.shifts}</td>
        </tr>`;
    }).join('');
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function updateStatCards() {
    const today     = new Date().toISOString().split('T')[0];
    const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })();

    const clockedIn   = allEntries.filter(e => !e.clockOut).length;
    const hoursToday  = allEntries.filter(e => e.date === today && e.totalMinutes != null)
                                  .reduce((s, e) => s + e.totalMinutes, 0) / 60;
    const hoursWeek   = allEntries.filter(e => e.date >= weekStart && e.totalMinutes != null)
                                  .reduce((s, e) => s + e.totalMinutes, 0) / 60;

    // Est pay this week
    const byStaffWeek = {};
    allEntries.filter(e => e.date >= weekStart && e.totalMinutes != null).forEach(e => {
        byStaffWeek[e.staffId] = (byStaffWeek[e.staffId] || 0) + e.totalMinutes;
    });
    let payWeek = 0;
    Object.entries(byStaffWeek).forEach(([sid, mins]) => {
        if (payRates[sid] != null) payWeek += (mins / 60) * payRates[sid];
    });

    document.getElementById('statClockedIn').textContent  = clockedIn;
    document.getElementById('statHoursToday').textContent = hoursToday.toFixed(1);
    document.getElementById('statHoursWeek').textContent  = hoursWeek.toFixed(1);
    document.getElementById('statPayWeek').textContent    = '$' + payWeek.toFixed(0);
}

// ── Live listener for clocked-in sessions ─────────────────────────────────────
function listenForActiveSessions() {
    const q = query(collection(db, 'timeclock'), where('clockOut', '==', null));
    onSnapshot(q, (snap) => {
        // Update allEntries with fresh active entries
        const activeIds = new Set(snap.docs.map(d => d.id));
        // Remove stale active entries then add current
        allEntries = allEntries.filter(e => !activeIds.has(e.id));
        snap.docs.forEach(d => allEntries.push({ id: d.id, ...d.data() }));
        document.getElementById('statClockedIn').textContent = snap.size;
    });
}

// ── Edit modal ────────────────────────────────────────────────────────────────
window.openEditModal = function (entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) return;

    document.getElementById('editEntryId').value = entryId;

    const inTime  = entry.clockIn  ? tsToDate(entry.clockIn)  : null;
    const outTime = entry.clockOut ? tsToDate(entry.clockOut) : null;

    document.getElementById('editClockIn').value  = inTime  ? toLocalInputVal(inTime)  : '';
    document.getElementById('editClockOut').value = outTime ? toLocalInputVal(outTime) : '';

    document.getElementById('editModal').classList.add('open');
};

window.closeModal = function () {
    document.getElementById('editModal').classList.remove('open');
};

window.saveEntry = async function () {
    const entryId = document.getElementById('editEntryId').value;
    const inVal   = document.getElementById('editClockIn').value;
    const outVal  = document.getElementById('editClockOut').value;

    if (!inVal) { showMsg('Clock In time is required.', 'error'); return; }

    const clockIn  = new Date(inVal);
    const clockOut = outVal ? new Date(outVal) : null;

    if (clockOut && clockOut <= clockIn) {
        showMsg('Clock Out must be after Clock In.', 'error'); return;
    }

    const totalMinutes = clockOut ? Math.round((clockOut - clockIn) / 60000) : null;

    await updateDoc(doc(db, 'timeclock', entryId), {
        clockIn:  clockIn,
        clockOut: clockOut,
        totalMinutes,
        date: clockIn.toISOString().split('T')[0]
    });

    // Update local copy
    const idx = allEntries.findIndex(e => e.id === entryId);
    if (idx !== -1) allEntries[idx] = { ...allEntries[idx], clockIn, clockOut, totalMinutes };

    closeModal();
    showMsg('Entry updated.', 'success');
    applyFilters();
};

window.deleteEntry = async function () {
    const entryId = document.getElementById('editEntryId').value;
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'timeclock', entryId));
    allEntries = allEntries.filter(e => e.id !== entryId);
    closeModal();
    showMsg('Entry deleted.', 'success');
    applyFilters();
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
window.switchTab = function (tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'summary') renderSummaryTab();
};

// ── CSV Export ────────────────────────────────────────────────────────────────
window.exportCSV = function () {
    const entries = filterLocally(allEntries);
    const rows = [['Staff Name', 'Date', 'Clock In', 'Clock Out', 'Duration (hrs)', 'Hourly Rate', 'Pay']];
    entries.forEach(e => {
        const inTime  = e.clockIn  ? tsToDate(e.clockIn).toLocaleString()  : '';
        const outTime = e.clockOut ? tsToDate(e.clockOut).toLocaleString() : '';
        const hours   = e.totalMinutes != null ? (e.totalMinutes / 60).toFixed(2) : '';
        const rate    = payRates[e.staffId] != null ? parseFloat(payRates[e.staffId]).toFixed(2) : '';
        const pay     = hours && rate ? (parseFloat(hours) * parseFloat(rate)).toFixed(2) : '';
        rows.push([e.staffName || e.staffId, e.date, inTime, outTime, hours, rate ? '$' + rate : '', pay ? '$' + pay : '']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timeclock-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

// ── Re-render both views whenever entries change ──────────────────────────────
function rerender() {
    filteredEntries = filterLocally(allEntries);
    renderEntriesTable(filteredEntries);
    renderSummaryTab();
    updateStatCards();
}

// Patch applyFilters to call rerender after load
const _origApply = window.applyFilters;
window.applyFilters = async function () { await loadEntries(); };
async function loadEntries() {
    const period = document.getElementById('filterPeriod').value;
    const since  = periodStart(period);
    let q;
    if (since) {
        q = query(collection(db, 'timeclock'), where('date', '>=', since), orderBy('date', 'desc'));
    } else {
        q = query(collection(db, 'timeclock'), orderBy('date', 'desc'));
    }
    const snap = await getDocs(q);
    allEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rerender();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function tsToDate(ts) {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    return new Date(ts);
}

function toLocalInputVal(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent  = text;
    el.className    = `msg msg-${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

window.logout = function () {
    signOut(auth).then(() => { window.location.href = 'admin-login.html'; });
};
