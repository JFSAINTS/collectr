import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBGz85M4pcshA4_ooJX9sCK4Kf9KfBHjXQ",
  authDomain: "collectr-4ecb9.firebaseapp.com",
  projectId: "collectr-4ecb9",
  storageBucket: "collectr-4ecb9.firebasestorage.app",
  messagingSenderId: "606660325614",
  appId: "1:606660325614:web:944f0384d6251f88b703ff"
};

let app, auth, db;
let isFirebaseConfigured = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseConfigured = true;
} catch (e) {
  console.warn('[Collectr] Firebase init error:', e.message);
}

export { auth, db, isFirebaseConfigured, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, fbSignOut, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, collection, serverTimestamp };
