import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

async function routeAfterLogin(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid)).catch(() => null);
    const role = userDoc?.exists() ? userDoc.data().role : null;

    if (role === 'admin') {
        window.location.href = "admin-dashboard.html";
        return;
    }

    if (role === 'staff') {
        window.location.href = "staff-portal.html";
        return;
    }

    // Customer role or no role yet — check customers collection
    const customerDoc = await getDoc(doc(db, "customers", user.email)).catch(() => null);
    if (role === 'customer' || customerDoc?.exists()) {
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: 'customer',
            customerId: user.email,
            lastLogin: new Date().toISOString()
        }, { merge: true });
        window.location.href = "customer-dashboard.html";
        return;
    }

    // Unknown user — sign out
    await auth.signOut();
    throw new Error("Account not found. Please contact Holliday's Lawn & Garden.");
}

function showSuccess() {
    const el = document.getElementById("successMessage");
    if (el) el.style.display = "block";
}

function showNotification(message, type = "error") {
    const errorContainer = document.getElementById("error-container");
    const errorMessage = document.getElementById("errorMessage");
    if (errorContainer && errorMessage) {
        errorContainer.style.display = "block";
        errorMessage.textContent = message;
        setTimeout(() => { errorContainer.style.display = "none"; }, 5000);
    }
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const submitButton = e.target.querySelector("button[type=submit]");

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            showSuccess();
            await routeAfterLogin(user);
        } catch (error) {
            console.error("Login error:", error);
            const msg = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found'
                ? "Invalid email or password."
                : error.message;
            showNotification(msg, "error");
            submitButton.disabled = false;
            submitButton.textContent = "Sign In";
        }
    });
}

const googleSignInButton = document.getElementById("googleSignIn");
if (googleSignInButton) {
    googleSignInButton.addEventListener("click", async () => {
        try {
            const { user } = await signInWithPopup(auth, googleProvider);
            showSuccess();
            await routeAfterLogin(user);
        } catch (error) {
            console.error("Google sign-in error:", error);
            showNotification(error.message, "error");
        }
    });
}
