import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, setDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACm0j7I8RX4ExIQRoejfk1HZMOQRGigBw",
    authDomain: "holiday-lawn-and-garden.firebaseapp.com",
    projectId: "holiday-lawn-and-garden",
    storageBucket: "holiday-lawn-and-garden.firebasestorage.app",
    messagingSenderId: "135322230444",
    appId: "1:135322230444:web:1a487b25a48aae07368909",
    measurementId: "G-KD6TBWR4ZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', async () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    // Check if user is admin
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        window.location.href = 'login.html';
        return;
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      window.location.href = 'login.html';
      return;
    }
  });

  // Logout button
  const logoutBtn = document.querySelector('.btn-danger');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = 'login.html';
    });
  }

  // Check for edit mode
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  if (editId) {
    // Edit mode — load existing data into form
    const pageTitle = document.querySelector('h1, .page-title, h2');
    if (pageTitle) pageTitle.textContent = 'Edit Staff Member';
    const submitBtn = document.querySelector('#staff-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    try {
      const snap = await getDoc(doc(db, 'staff', editId));
      if (snap.exists()) {
        const d = snap.data();
        const fields = ['firstName','lastName','email','phone','role','status','hireDate','department','address','emergencyContact','notes'];
        fields.forEach(f => {
          const el = document.getElementById(f);
          if (el && d[f] !== undefined) el.value = d[f];
        });
      }
      // Load existing pay rate
      const rateSnap = await getDoc(doc(db, 'staffPayRates', editId));
      if (rateSnap.exists()) {
        const rateEl = document.getElementById('hourlyRate');
        if (rateEl && rateSnap.data().hourlyRate !== undefined) {
          rateEl.value = parseFloat(rateSnap.data().hourlyRate).toFixed(2);
        }
      }
    } catch (err) {
      console.error('Error loading staff for edit:', err);
    }
  }

  // Save pay rate by both staff doc ID and auth UID (looked up by email).
  // Timeclock entries store staffId = auth UID, so we must index by uid too.
  async function savePayRateByAll(docId, email, rate) {
    const rateData = { hourlyRate: rate, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'staffPayRates', docId), rateData, { merge: true });
    if (email) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const uid = snap.docs[0].id;
          if (uid !== docId) {
            await setDoc(doc(db, 'staffPayRates', uid), rateData, { merge: true });
          }
        }
      } catch (err) {
        console.warn('Could not save pay rate by UID:', err);
      }
    }
  }

  // Form handling
  const form = document.getElementById('staff-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(form));
      // Separate pay rate from staff profile data
      const { hourlyRate, ...staffData } = formData;
      const rate = parseFloat(hourlyRate);
      try {
        if (editId) {
          await updateDoc(doc(db, 'staff', editId), { ...staffData, updatedAt: serverTimestamp() });
          if (!isNaN(rate) && rate >= 0) {
            await savePayRateByAll(editId, staffData.email, rate);
          }
          alert('Staff member updated successfully!');
        } else {
          const docRef = await addDoc(collection(db, 'staff'), { ...staffData, createdAt: serverTimestamp() });
          if (!isNaN(rate) && rate >= 0) {
            await savePayRateByAll(docRef.id, staffData.email, rate);
          }
          alert('Staff member added successfully!');
          form.reset();
        }
        window.location.href = 'staff.html';
      } catch (err) {
        alert('Error saving staff member: ' + err.message);
      }
    });
  }
});
