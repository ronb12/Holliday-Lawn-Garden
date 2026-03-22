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

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

const urlParams  = new URLSearchParams(window.location.search);
const editId     = urlParams.get('id');
const isEdit     = !!editId;

const form       = document.getElementById('inventory-form');
const alertEl    = document.getElementById('alert');
const submitBtn  = document.getElementById('submit-btn');
const submitLabel = document.getElementById('submit-label');
const pageTitle  = document.getElementById('page-title');

if (isEdit) {
    pageTitle.textContent = 'Edit Inventory Item';
    submitLabel.textContent = 'Save Changes';
    document.querySelector('p[style]').textContent = 'Update the details below.';
}

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'admin-login.html'; return; }
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
            window.location.href = 'admin-login.html';
            return;
        }
        if (isEdit) await loadItem();
    } catch (e) {
        window.location.href = 'admin-login.html';
    }
});

async function loadItem() {
    try {
        const snap = await getDoc(doc(db, 'inventory', editId));
        if (!snap.exists()) { showAlert('Item not found.', 'error'); return; }
        const data = snap.data();
        document.getElementById('name').value        = data.name        || '';
        document.getElementById('sku').value         = data.sku         || '';
        document.getElementById('category').value    = data.category    || '';
        document.getElementById('supplier').value    = data.supplier    || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('quantity').value    = data.quantity    ?? '';
        document.getElementById('reorderLevel').value = data.reorderLevel ?? 10;
        document.getElementById('price').value       = data.price       ?? '';
        document.getElementById('location').value    = data.location    || '';
    } catch (e) {
        showAlert('Failed to load item: ' + e.message, 'error');
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitLabel.textContent = isEdit ? 'Saving…' : 'Adding…';

    const data = {
        name:         document.getElementById('name').value.trim(),
        sku:          document.getElementById('sku').value.trim(),
        category:     document.getElementById('category').value,
        supplier:     document.getElementById('supplier').value.trim(),
        description:  document.getElementById('description').value.trim(),
        quantity:     parseInt(document.getElementById('quantity').value) || 0,
        reorderLevel: parseInt(document.getElementById('reorderLevel').value) || 10,
        price:        parseFloat(document.getElementById('price').value) || 0,
        location:     document.getElementById('location').value.trim(),
        updatedAt:    serverTimestamp(),
    };

    try {
        if (isEdit) {
            await updateDoc(doc(db, 'inventory', editId), data);
            showAlert('Item updated successfully!', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'inventory'), data);
            showAlert('Item added successfully!', 'success');
            form.reset();
        }
        setTimeout(() => { window.location.href = 'inventory.html'; }, 1200);
    } catch (err) {
        showAlert('Error: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitLabel.textContent = isEdit ? 'Save Changes' : 'Add Item';
    }
});

function showAlert(msg, type) {
    alertEl.textContent = msg;
    alertEl.style.display = 'block';
    alertEl.style.background = type === 'success' ? '#e8f5e9' : '#ffebee';
    alertEl.style.color      = type === 'success' ? '#2e7d32' : '#c62828';
}

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'admin-login.html';
};
