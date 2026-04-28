import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

const urlParams   = new URLSearchParams(window.location.search);
const editId      = urlParams.get('id');
const isEdit      = !!editId;

const form        = document.getElementById('inventory-form');
const alertEl     = document.getElementById('alert');
const submitBtn   = document.getElementById('submit-btn');
const submitLabel = document.getElementById('submit-label');

if (isEdit) {
    document.getElementById('page-title').textContent = 'Edit Inventory Item';
    document.getElementById('page-sub').textContent   = 'Update the details below.';
    submitLabel.textContent = 'Save Changes';
}

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
            window.location.href = 'login.html'; return;
        }
        if (isEdit) await loadItem();
    } catch (e) {
        window.location.href = 'login.html';
    }
});

async function loadItem() {
    try {
        const snap = await getDoc(doc(db, 'inventory', editId));
        if (!snap.exists()) { showAlert('Item not found.', 'error'); return; }
        const d = snap.data();
        setValue('name',         d.name);
        setValue('sku',          d.sku);
        setValue('category',     d.category);
        setValue('brand',        d.brand);
        setValue('supplier',     d.supplier);
        setValue('unit',         d.unit);
        setValue('description',  d.description);
        setValue('quantity',     d.quantity);
        setValue('reorderLevel', d.reorderLevel ?? 5);
        setValue('location',     d.location);
        setValue('condition',    d.condition);
        setValue('cost',         d.cost);
        setValue('price',        d.price);
    } catch (e) {
        showAlert('Failed to load item: ' + e.message, 'error');
    }
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitLabel.textContent = isEdit ? 'Saving…' : 'Adding…';

    const data = {
        name:         val('name'),
        sku:          val('sku'),
        category:     val('category'),
        brand:        val('brand'),
        supplier:     val('supplier'),
        unit:         val('unit'),
        description:  val('description'),
        quantity:     num('quantity'),
        reorderLevel: num('reorderLevel') || 5,
        location:     val('location'),
        condition:    val('condition'),
        cost:         flt('cost'),
        price:        flt('price'),
        updatedAt:    serverTimestamp(),
    };

    try {
        if (isEdit) {
            await updateDoc(doc(db, 'inventory', editId), data);
            showAlert('Item updated!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'inventory'), data);
            showAlert('Item added to inventory!', 'success');
            form.reset();
        }
        setTimeout(() => { window.location.href = 'inventory.html'; }, 1200);
    } catch (err) {
        showAlert('Error: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitLabel.textContent = isEdit ? 'Save Changes' : 'Add to Inventory';
    }
});

const val = (id) => (document.getElementById(id)?.value || '').trim();
const num = (id) => parseInt(document.getElementById(id)?.value) || 0;
const flt = (id) => parseFloat(document.getElementById(id)?.value) || 0;

function showAlert(msg, type) {
    alertEl.textContent    = msg;
    alertEl.style.display  = 'block';
    alertEl.style.background = type === 'success' ? '#e8f5e9' : '#ffebee';
    alertEl.style.color      = type === 'success' ? '#2e7d32' : '#c62828';
}

window.logout = async () => { await signOut(auth); window.location.href = 'login.html'; };
