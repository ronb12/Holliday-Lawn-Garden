import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, deleteDoc, getDocs, doc, getDoc, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

let inventory = [];
let filteredInventory = [];

const loadingDiv      = document.getElementById('loading');
const errorDiv        = document.getElementById('error');
const inventoryTable  = document.getElementById('inventory-table');
const inventoryTbody  = document.getElementById('inventory-tbody');
const totalItemsEl    = document.getElementById('total-items');
const instockEl       = document.getElementById('instock-items');
const lowStockEl      = document.getElementById('lowstock-items');
const outOfStockEl    = document.getElementById('outofstock-items');
const searchInput     = document.getElementById('search-item');
const categoryFilter  = document.getElementById('category-filter');
const statusFilter    = document.getElementById('status-filter');
const sortBySelect    = document.getElementById('sort-by');

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'admin-login.html'; return; }
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            loadInventory();
            setupEventListeners();
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (e) {
        window.location.href = 'admin-login.html';
    }
});

function loadInventory() {
    loadingDiv.style.display = 'block';
    inventoryTable.style.display = 'none';
    errorDiv.style.display = 'none';

    const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        inventory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        filterInventory();
        loadingDiv.style.display = 'none';
        inventoryTable.style.display = 'table';
    }, (err) => {
        showError('Failed to load inventory: ' + err.message);
    });
}

function updateStats() {
    const total    = inventory.length;
    const instock  = inventory.filter(i => (i.quantity || 0) > (i.reorderLevel || 10)).length;
    const lowStock = inventory.filter(i => (i.quantity || 0) <= (i.reorderLevel || 10) && (i.quantity || 0) > 0).length;
    const outOf    = inventory.filter(i => (i.quantity || 0) === 0).length;

    totalItemsEl.textContent  = total;
    instockEl.textContent     = instock;
    lowStockEl.textContent    = lowStock;
    outOfStockEl.textContent  = outOf;
}

function filterInventory() {
    const search   = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const status   = statusFilter.value;
    const sort     = sortBySelect.value;

    filteredInventory = inventory.filter(item => {
        const matchSearch = !search ||
            item.name?.toLowerCase().includes(search) ||
            item.sku?.toLowerCase().includes(search) ||
            item.category?.toLowerCase().includes(search);

        const matchCategory = !category || item.category === category;

        const qty = item.quantity || 0;
        const reorder = item.reorderLevel || 10;
        const matchStatus = !status ||
            (status === 'instock'  && qty > reorder) ||
            (status === 'low'      && qty <= reorder && qty > 0) ||
            (status === 'out'      && qty === 0);

        return matchSearch && matchCategory && matchStatus;
    });

    filteredInventory.sort((a, b) => {
        if (sort === 'quantity') return (a.quantity || 0) - (b.quantity || 0);
        if (sort === 'category') return (a.category || '').localeCompare(b.category || '');
        return (a.name || '').localeCompare(b.name || '');
    });

    renderInventory();
}

function renderInventory() {
    inventoryTbody.innerHTML = '';
    if (!filteredInventory.length) {
        inventoryTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#666;">No inventory items found.</td></tr>`;
        return;
    }
    filteredInventory.forEach(item => {
        const qty = item.quantity || 0;
        const reorder = item.reorderLevel || 10;
        const statusKey = qty === 0 ? 'out' : qty <= reorder ? 'low' : 'instock';
        const statusLabel = qty === 0 ? 'Out of Stock' : qty <= reorder ? 'Low Stock' : 'In Stock';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name || 'N/A'}</strong><br><small style="color:#666;">SKU: ${item.sku || 'N/A'}</small></td>
            <td style="text-transform:capitalize;">${item.category || 'N/A'}</td>
            <td><strong>${qty}</strong></td>
            <td><strong>$${(item.price || 0).toFixed(2)}</strong></td>
            <td><span class="item-status status-${statusKey}">${statusLabel}</span></td>
            <td>${formatDate(item.updatedAt || item.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="editItem('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>`;
        inventoryTbody.appendChild(row);
    });
}

function setupEventListeners() {
    searchInput.addEventListener('input', filterInventory);
    categoryFilter.addEventListener('change', filterInventory);
    statusFilter.addEventListener('change', filterInventory);
    sortBySelect.addEventListener('change', filterInventory);
}

function formatDate(ts) {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
}

window.editItem = (id) => { window.location.href = `add-inventory.html?id=${id}`; };

window.deleteItem = async (id) => {
    if (!confirm('Delete this inventory item?')) return;
    try {
        await deleteDoc(doc(db, 'inventory', id));
    } catch (e) {
        showError('Failed to delete item: ' + e.message);
    }
};

window.exportInventory = () => {
    const csv = "data:text/csv;charset=utf-8,Name,SKU,Category,Quantity,Price,Supplier\n" +
        filteredInventory.map(i =>
            `"${i.name||''}","${i.sku||''}","${i.category||''}","${i.quantity||0}","${i.price||0}","${i.supplier||''}"`
        ).join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = 'inventory.csv';
    a.click();
};

window.refreshInventory = () => loadInventory();

window.clearAllInventory = async () => {
    if (!confirm('Are you sure you want to delete ALL inventory items? This cannot be undone.')) return;
    if (!confirm('Final confirmation — delete all inventory items?')) return;
    try {
        const snap = await getDocs(collection(db, 'inventory'));
        const deletes = snap.docs.map(d => deleteDoc(doc(db, 'inventory', d.id)));
        await Promise.all(deletes);
        showError('');
    } catch (e) {
        showError('Failed to clear inventory: ' + e.message);
    }
};

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'admin-login.html';
};
