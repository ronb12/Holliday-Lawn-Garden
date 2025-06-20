import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const adminLoginForm = document.getElementById('admin-login-form');
const adminEmail = document.getElementById('admin-email');
const adminPassword = document.getElementById('admin-password');
const rememberMe = document.getElementById('remember-me');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

// Show loading overlay
function showLoading(message = 'Loading...') {
  if (loadingMessage) loadingMessage.textContent = message;
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}

// Show error message
function showError(message) {
  if (errorMessage) errorMessage.textContent = message;
  if (errorContainer) errorContainer.style.display = 'block';
  if (successMessage) successMessage.style.display = 'none';
}

// Show success message
function showSuccess(message) {
  if (successMessage) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
  }
  if (errorContainer) errorContainer.style.display = 'none';
}

// Handle form submission
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Signing in...');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail.value, adminPassword.value);
      const user = userCredential.user;

      // Check if user is an admin
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        showSuccess('Login successful! Redirecting to admin dashboard...');
        setTimeout(() => {
          window.location.href = 'admin-dashboard.html';
        }, 1500);
      } else {
        await auth.signOut();
        showError('Access denied. Admin privileges required.');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Invalid email or password. Please try again.');
    } finally {
      hideLoading();
    }
  });
}

// Handle remember me
if (rememberMe) {
  rememberMe.addEventListener('change', (e) => {
    if (e.target.checked) {
      localStorage.setItem('rememberAdmin', 'true');
    } else {
      localStorage.removeItem('rememberAdmin');
    }
  });
}

// Check for remembered email
window.addEventListener('load', () => {
  if (localStorage.getItem('rememberAdmin') === 'true' && rememberMe) {
    rememberMe.checked = true;
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail && adminEmail) {
      adminEmail.value = savedEmail;
    }
  }
});