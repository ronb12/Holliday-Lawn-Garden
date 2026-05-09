import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyACm0j7I8RX4ExIQRoejfk1HZMOQRGigBw",
    authDomain: "holiday-lawn-and-garden.firebaseapp.com",
    projectId: "holiday-lawn-and-garden",
    storageBucket: "holiday-lawn-and-garden.firebasestorage.app",
    messagingSenderId: "135322230444",
    appId: "1:135322230444:web:1a487b25a48aae07368909",
    measurementId: "G-KD6TBWR4ZT"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// DOM refs
const appointmentsTable   = document.getElementById('appointments-table');
const appointmentsTbody   = document.getElementById('appointments-tbody');
const loadingDiv          = document.getElementById('loading');
const errorDiv            = document.getElementById('error');
const searchInput         = document.getElementById('search-appointment');
const statusFilter        = document.getElementById('status-filter');
const serviceFilter       = document.getElementById('service-filter');
const sortBySelect        = document.getElementById('sort-by');
const totalAppointmentsEl = document.getElementById('total-appointments');
const pendingAppointmentsEl   = document.getElementById('pending-appointments');
const completedAppointmentsEl = document.getElementById('completed-appointments');
const cancelledAppointmentsEl = document.getElementById('cancelled-appointments');

let appointments = [];
let filteredAppointments = [];

// ── Auth guard ─────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                loadAppointments();
                setupEventListeners();
            } else {
                window.location.href = 'login.html';
            }
        } catch (e) {
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

// ── Normalize: unify field names from online booking vs admin-created entries ──
function normalize(id, data) {
    const firstName = data.firstName || '';
    const lastName  = data.lastName  || '';
    const fullName  = data.customerName || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');
    const email     = data.customerEmail || data.email || '';

    // appointmentDate: prefer Firestore Timestamp, fall back to preferredDate string
    let apptDate = data.appointmentDate || null;
    if (!apptDate && data.preferredDate) apptDate = data.preferredDate;

    return {
        id,
        ...data,
        customerName:  fullName,
        customerEmail: email,
        displayDate:   apptDate,
        preferredTime: data.preferredTime || '',
        phone:         data.phone || '',
        address:       data.address || '',
        notes:         data.notes  || '',
        staffAssigned: data.staffAssigned || '',
        status:        data.status || 'pending',
        serviceType:   data.serviceType || '',
        source:        data.source || '',
        recurring:     data.recurring || false,
        frequency:     data.frequency || '',
    };
}

// ── Load ───────────────────────────────────────────────────────────────────────
function loadAppointments() {
    loadingDiv.style.display    = 'block';
    appointmentsTable.style.display = 'none';
    errorDiv.style.display      = 'none';

    onSnapshot(
        query(collection(db, 'appointments'), orderBy('createdAt', 'desc')),
        (snap) => {
            appointments = snap.docs.map(d => normalize(d.id, d.data()));
            updateStats();
            filterAppointments();
            loadingDiv.style.display = 'none';
            appointmentsTable.style.display = 'table';
        },
        (err) => {
            console.error('appointments error:', err);
            showError('Failed to load appointments. Please try again.');
        }
    );
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function updateStats() {
    totalAppointmentsEl.textContent     = appointments.length;
    pendingAppointmentsEl.textContent   = appointments.filter(a => a.status === 'pending').length;
    completedAppointmentsEl.textContent = appointments.filter(a => a.status === 'completed').length;
    cancelledAppointmentsEl.textContent = appointments.filter(a => a.status === 'cancelled').length;
}

// ── Filter & sort ──────────────────────────────────────────────────────────────
function filterAppointments() {
    const search  = (searchInput?.value || '').toLowerCase();
    const status  = statusFilter?.value  || '';
    const service = serviceFilter?.value || '';
    const sortBy  = sortBySelect?.value  || 'date';

    filteredAppointments = appointments.filter(a => {
        const matchSearch = !search ||
            (a.customerName  || '').toLowerCase().includes(search) ||
            (a.customerEmail || '').toLowerCase().includes(search) ||
            (a.phone         || '').toLowerCase().includes(search) ||
            (a.serviceType   || '').toLowerCase().includes(search) ||
            (a.address       || '').toLowerCase().includes(search);
        const matchStatus  = !status  || a.status      === status;
        const matchService = !service || a.serviceType === service;
        return matchSearch && matchStatus && matchService;
    });

    filteredAppointments.sort((a, b) => {
        if (sortBy === 'customer') return (a.customerName || '').localeCompare(b.customerName || '');
        if (sortBy === 'service')  return (a.serviceType  || '').localeCompare(b.serviceType  || '');
        if (sortBy === 'status')   return (a.status       || '').localeCompare(b.status       || '');
        // default: date
        const toMs = v => v?.toDate ? v.toDate().getTime() : (v ? new Date(v).getTime() : 0);
        return toMs(b.displayDate) - toMs(a.displayDate);
    });

    renderAppointments();
}

// ── Render table ───────────────────────────────────────────────────────────────
function renderAppointments() {
    appointmentsTbody.innerHTML = '';
    if (!filteredAppointments.length) {
        appointmentsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#666;">No appointments found matching your criteria.</td></tr>`;
        return;
    }

    filteredAppointments.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${a.customerName || 'N/A'}</strong><br>
                <small style="color:#666;">${a.customerEmail || ''}</small>
                ${a.phone ? `<br><small style="color:#888;">${a.phone}</small>` : ''}
            </td>
            <td>${formatServiceType(a.serviceType)}</td>
            <td>${formatDate(a.displayDate)}${a.preferredTime ? '<br><small style="color:#888;">' + a.preferredTime + '</small>' : ''}</td>
            <td>${a.duration ? a.duration + ' min' : '<em style="color:#aaa;">—</em>'}</td>
            <td><span class="appointment-status status-${a.status}">${a.status}</span></td>
            <td>${a.staffAssigned || '<em style="color:#aaa;">Unassigned</em>'}</td>
            <td>${formatDate(a.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-small" onclick="viewAppointment('${a.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="btn btn-primary btn-small"   onclick="editAppointment('${a.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger btn-small"    onclick="deleteAppointment('${a.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        appointmentsTbody.appendChild(row);
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(v) {
    if (!v) return 'N/A';
    try {
        const d = v.toDate ? v.toDate() : new Date(v);
        if (isNaN(d)) return String(v);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return String(v); }
}

function formatServiceType(s) {
    if (!s) return 'N/A';
    return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
}

function setupEventListeners() {
    searchInput?.addEventListener('input', filterAppointments);
    statusFilter?.addEventListener('change', filterAppointments);
    serviceFilter?.addEventListener('change', filterAppointments);
    sortBySelect?.addEventListener('change', filterAppointments);
}

// ── View modal ─────────────────────────────────────────────────────────────────
window.viewAppointment = function(id) {
    const a = appointments.find(x => x.id === id);
    if (!a) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:2rem;max-width:560px;width:90%;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <h3 style="margin:0;color:#2e7d32;"><i class="fas fa-calendar-check" style="margin-right:.5rem;"></i>Appointment Details</h3>
                <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:.95rem;">
                ${row('Customer',  a.customerName || 'N/A')}
                ${row('Email',     a.customerEmail || 'N/A')}
                ${row('Phone',     a.phone || 'N/A')}
                ${row('Address',   a.address || 'N/A')}
                ${row('Service',   formatServiceType(a.serviceType))}
                ${row('Preferred Date', formatDate(a.displayDate))}
                ${row('Time',      a.preferredTime || 'N/A')}
                ${row('Status',    `<span class="appointment-status status-${a.status}">${a.status}</span>`)}
                ${row('Staff',     a.staffAssigned || 'Unassigned')}
                ${row('Source',    a.source || 'N/A')}
                ${a.recurring ? row('Recurring', `Yes — ${a.frequency || ''}`) : ''}
                ${row('Notes',     a.notes || '—')}
                ${row('Submitted', formatDate(a.createdAt))}
            </table>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
};

function row(label, value) {
    return `<tr>
        <td style="padding:.5rem .75rem;font-weight:600;color:#555;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f0f0f0;">${label}</td>
        <td style="padding:.5rem .75rem;border-bottom:1px solid #f0f0f0;">${value}</td>
    </tr>`;
}

// ── Edit modal ─────────────────────────────────────────────────────────────────
window.editAppointment = function(id) {
    const a = appointments.find(x => x.id === id);
    if (!a) return;

    // Determine date value for input
    let dateVal = '';
    if (a.displayDate) {
        try {
            const d = a.displayDate.toDate ? a.displayDate.toDate() : new Date(a.displayDate);
            if (!isNaN(d)) dateVal = d.toISOString().split('T')[0];
        } catch { dateVal = String(a.displayDate); }
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:2rem;max-width:480px;width:90%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <h3 style="margin:0;color:#2e7d32;"><i class="fas fa-edit" style="margin-right:.5rem;"></i>Edit Appointment</h3>
                <button id="edit-close-btn" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
            </div>
            <p style="margin:0 0 1rem;color:#555;font-size:.9rem;"><strong>${a.customerName || 'N/A'}</strong> — ${formatServiceType(a.serviceType)}</p>
            <div id="edit-alert" style="display:none;padding:.65rem 1rem;border-radius:6px;margin-bottom:1rem;"></div>
            <form id="edit-appt-form">
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:.3rem;">Status</label>
                    <select id="edit-status" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem;">
                        <option value="pending"   ${a.status==='pending'   ? 'selected':''}>Pending</option>
                        <option value="confirmed" ${a.status==='confirmed' ? 'selected':''}>Confirmed</option>
                        <option value="completed" ${a.status==='completed' ? 'selected':''}>Completed</option>
                        <option value="cancelled" ${a.status==='cancelled' ? 'selected':''}>Cancelled</option>
                    </select>
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:.3rem;">Appointment Date</label>
                    <input type="date" id="edit-date" value="${dateVal}" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem;">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:.3rem;">Staff Assigned</label>
                    <input type="text" id="edit-staff" value="${a.staffAssigned || ''}" placeholder="Staff member name" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem;">
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;margin-bottom:.3rem;">Admin Notes</label>
                    <textarea id="edit-notes" rows="3" style="width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px;font-size:.95rem;resize:vertical;">${a.notes || ''}</textarea>
                </div>
                <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                    <button type="button" id="edit-cancel-btn" style="padding:.6rem 1.2rem;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">Cancel</button>
                    <button type="submit" id="edit-save-btn" style="padding:.6rem 1.4rem;border:none;border-radius:6px;background:#2e7d32;color:#fff;font-weight:600;cursor:pointer;">Save Changes</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#edit-close-btn').onclick  = () => overlay.remove();
    overlay.querySelector('#edit-cancel-btn').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#edit-appt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn   = overlay.querySelector('#edit-save-btn');
        const alert = overlay.querySelector('#edit-alert');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        alert.style.display = 'none';

        const dateStr = overlay.querySelector('#edit-date').value;
        const updates = {
            status:        overlay.querySelector('#edit-status').value,
            staffAssigned: overlay.querySelector('#edit-staff').value.trim(),
            notes:         overlay.querySelector('#edit-notes').value.trim(),
            updatedAt:     serverTimestamp(),
        };
        if (dateStr) {
            updates.appointmentDate = new Date(dateStr + 'T00:00:00');
            updates.preferredDate   = dateStr;
        }

        try {
            await updateDoc(doc(db, 'appointments', id), updates);
            alert.textContent = 'Saved!';
            alert.style.cssText = 'display:block;background:#e8f5e9;color:#2e7d32;padding:.65rem 1rem;border-radius:6px;margin-bottom:1rem;';
            setTimeout(() => overlay.remove(), 1000);
        } catch (err) {
            alert.textContent = 'Save failed: ' + err.message;
            alert.style.cssText = 'display:block;background:#ffebee;color:#c62828;padding:.65rem 1rem;border-radius:6px;margin-bottom:1rem;';
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });
};

// ── Delete ─────────────────────────────────────────────────────────────────────
window.deleteAppointment = async function(id) {
    const a = appointments.find(x => x.id === id);
    const name = a?.customerName || 'this appointment';
    if (!confirm(`Delete appointment for ${name}? This cannot be undone.`)) return;
    try {
        await deleteDoc(doc(db, 'appointments', id));
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
};

// ── Export ─────────────────────────────────────────────────────────────────────
window.exportAppointments = function() {
    const csv = ['Customer,Email,Phone,Service,Date,Time,Status,Staff,Notes']
        .concat(filteredAppointments.map(a =>
            [a.customerName, a.customerEmail, a.phone, a.serviceType,
             formatDate(a.displayDate), a.preferredTime, a.status, a.staffAssigned, a.notes]
            .map(v => `"${(v || '').replace(/"/g, '""')}"`)
            .join(',')
        )).join('\n');
    const link = Object.assign(document.createElement('a'), {
        href:     'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
        download: 'appointments.csv'
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
};

window.refreshAppointments = function() { loadAppointments(); };
