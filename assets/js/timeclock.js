import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, addDoc, updateDoc, doc, query,
    where, orderBy, getDocs, getDoc, serverTimestamp, Timestamp
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
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let staffData = null;
let activeEntry = null;   // open (not yet clocked-out) entry
let shiftInterval = null;
let clockInterval = null;
let currentPayRate = null;

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;
    await loadStaffProfile();
    await loadPayRate();
    startLiveClock();
    await checkActiveShift();
    loadHistory();
});

async function loadStaffProfile() {
    // Look up staff record by uid first
    const snap = await getDoc(doc(db, 'staff', currentUser.uid)).catch(() => null);
    if (snap && snap.exists()) {
        staffData = { id: snap.id, ...snap.data() };
    } else {
        // Fallback: query by email (may fail if rules don't allow staff to list)
        try {
            const q = query(collection(db, 'staff'), where('email', '==', currentUser.email));
            const qs = await getDocs(q);
            if (!qs.empty) {
                staffData = { id: qs.docs[0].id, ...qs.docs[0].data() };
            } else {
                staffData = { id: currentUser.uid, name: currentUser.displayName || currentUser.email };
            }
        } catch {
            // No staff record found or no permission — use auth identity as fallback
            staffData = { id: currentUser.uid, name: currentUser.displayName || currentUser.email };
        }
    }
    document.getElementById('staffName').textContent = staffData.name || staffData.firstName || currentUser.email;
}

async function loadPayRate() {
    const rateDoc = await getDoc(doc(db, 'staffPayRates', staffData.id)).catch(() => null);
    if (rateDoc && rateDoc.exists()) {
        currentPayRate = parseFloat(rateDoc.data().hourlyRate) || null;
    }
}

// ── Live clock ────────────────────────────────────────────────────────────────
function startLiveClock() {
    const tick = () => {
        const now = new Date();
        document.getElementById('liveClock').textContent = now.toLocaleTimeString();
        document.getElementById('liveDate').textContent = now.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };
    tick();
    clockInterval = setInterval(tick, 1000);
}

// ── Check for open shift ──────────────────────────────────────────────────────
async function checkActiveShift() {
    const q = query(
        collection(db, 'timeclock'),
        where('staffId', '==', staffData.id),
        where('clockOut', '==', null)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
        activeEntry = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setUIState('in');
    } else {
        activeEntry = null;
        setUIState('out');
    }
}

// ── UI state ──────────────────────────────────────────────────────────────────
function setUIState(state) {
    const badge    = document.getElementById('statusBadge');
    const dot      = document.getElementById('statusDot');
    const statusTx = document.getElementById('statusText');
    const btn      = document.getElementById('clockBtn');
    const btnIcon  = document.getElementById('clockBtnIcon');
    const btnText  = document.getElementById('clockBtnText');
    const timer    = document.getElementById('shiftTimer');

    if (state === 'in') {
        badge.className = 'status-badge status-in';
        dot.className   = 'status-dot status-dot-in';
        statusTx.textContent = 'Clocked In';
        btn.className   = 'clock-btn btn-clock-out';
        btnIcon.className = 'fas fa-sign-out-alt';
        btnText.textContent = 'Clock Out';
        timer.classList.add('visible');
        startShiftTimer();
    } else {
        badge.className = 'status-badge status-out';
        dot.className   = 'status-dot status-dot-out';
        statusTx.textContent = 'Clocked Out';
        btn.className   = 'clock-btn btn-clock-in';
        btnIcon.className = 'fas fa-sign-in-alt';
        btnText.textContent = 'Clock In';
        timer.classList.remove('visible');
        clearInterval(shiftInterval);
    }
}

function startShiftTimer() {
    clearInterval(shiftInterval);

    // Populate rate display once, then show the earnings block
    const earningsEl = document.getElementById('liveEarnings');
    const liveRateEl = document.getElementById('liveRate');
    const liveEarnedEl = document.getElementById('liveEarned');

    if (currentPayRate !== null) {
        liveRateEl.textContent = `$${currentPayRate.toFixed(2)}/hr`;
        earningsEl.style.display = 'flex';
    }

    const tick = () => {
        if (!activeEntry?.clockIn) return;
        const inTime = activeEntry.clockIn.toDate ? activeEntry.clockIn.toDate() : new Date(activeEntry.clockIn);
        const elapsedSec = Math.floor((Date.now() - inTime.getTime()) / 1000);
        document.getElementById('shiftDuration').textContent = formatDuration(elapsedSec);

        if (currentPayRate !== null) {
            const earned = (elapsedSec / 3600) * currentPayRate;
            liveEarnedEl.textContent = `$${earned.toFixed(2)}`;
        }
    };
    tick();
    shiftInterval = setInterval(tick, 1000);
}

// ── Clock action ──────────────────────────────────────────────────────────────
window.handleClockAction = async function () {
    const btn = document.getElementById('clockBtn');
    btn.disabled = true;
    btn.classList.add('btn-disabled');

    try {
        if (!activeEntry) {
            // Clock In
            const docRef = await addDoc(collection(db, 'timeclock'), {
                staffId:    staffData.id,
                staffName:  staffData.name || currentUser.email,
                staffEmail: currentUser.email,
                clockIn:    serverTimestamp(),
                clockOut:   null,
                totalMinutes: null,
                date: new Date().toISOString().split('T')[0]
            });
            // Re-read to get server timestamp
            const newDoc = await getDoc(docRef);
            activeEntry = { id: newDoc.id, ...newDoc.data() };
            setUIState('in');
            showMsg('Clocked in successfully!', 'success');
        } else {
            // Clock Out
            const inTime  = activeEntry.clockIn.toDate ? activeEntry.clockIn.toDate() : new Date(activeEntry.clockIn);
            const outTime = new Date();
            const totalMinutes = Math.round((outTime - inTime) / 60000);
            await updateDoc(doc(db, 'timeclock', activeEntry.id), {
                clockOut: serverTimestamp(),
                totalMinutes
            });
            activeEntry = null;
            setUIState('out');
            showMsg(`Clocked out. Shift duration: ${formatMinutes(totalMinutes)}`, 'success');
            loadHistory();
        }
    } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
    }
};

// ── History ───────────────────────────────────────────────────────────────────
window.loadHistory = async function () {
    const days = parseInt(document.getElementById('periodFilter').value);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    // Simple single-field query — no composite index required.
    // Date filtering and sorting are done client-side.
    const q = query(
        collection(db, 'timeclock'),
        where('staffId', '==', staffData.id)
    );

    const snap = await getDocs(q).catch(() => ({ docs: [] }));
    const entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => !e.date || e.date >= sinceStr)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    renderHistory(entries);
    renderPaySummary(entries);
};

function renderHistory(entries) {
    const body = document.getElementById('historyBody');
    if (!entries.length) {
        body.innerHTML = '<div class="no-data"><i class="fas fa-clock"></i><p>No entries in this period.</p></div>';
        return;
    }
    const rows = entries.map(e => {
        const inTime  = e.clockIn  ? (e.clockIn.toDate  ? e.clockIn.toDate()  : new Date(e.clockIn))  : null;
        const outTime = e.clockOut ? (e.clockOut.toDate ? e.clockOut.toDate() : new Date(e.clockOut)) : null;
        return `
            <tr>
                <td>${e.date}</td>
                <td>${inTime  ? inTime.toLocaleTimeString()  : '--'}</td>
                <td>${outTime ? outTime.toLocaleTimeString() : '<span style="color:#ef5350;font-weight:600;">Active</span>'}</td>
                <td>${e.totalMinutes != null ? formatMinutes(e.totalMinutes) : '--'}</td>
            </tr>`;
    }).join('');

    body.innerHTML = `
        <table>
            <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Duration</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

async function renderPaySummary(entries) {
    const completed = entries.filter(e => e.totalMinutes != null);
    const totalMinutes = completed.reduce((s, e) => s + e.totalMinutes, 0);
    const totalHours = totalMinutes / 60;

    // Fetch pay rate set by admin
    let rate = null;
    const rateDoc = await getDoc(doc(db, 'staffPayRates', staffData.id)).catch(() => null);
    if (rateDoc && rateDoc.exists()) rate = rateDoc.data().hourlyRate;

    const summary = document.getElementById('paySummary');
    summary.style.display = 'block';
    document.getElementById('summaryHours').textContent = totalHours.toFixed(2) + ' hrs';
    document.getElementById('summaryRate').textContent  = rate != null ? '$' + parseFloat(rate).toFixed(2) + '/hr' : 'Rate not set';
    document.getElementById('summaryPay').textContent   = rate != null ? '$' + (totalHours * rate).toFixed(2) : 'N/A';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className   = `msg msg-${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

window.logout = function () {
    signOut(auth).then(() => { window.location.href = 'login.html'; });
};
