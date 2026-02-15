import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCpI2GRtLXksYu-p9SoFvr1FwM99sOkcSw",
  authDomain: "music-streaming-app-dcd57.firebaseapp.com",
  projectId: "music-streaming-app-dcd57",
  storageBucket: "music-streaming-app-dcd57.firebasestorage.app",
  messagingSenderId: "10885097238",
  appId: "1:10885097238:web:caa03da858ec3225f49237",
  measurementId: "G-YQVQTS2X6H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Set persistence to LOCAL
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider - simple config for popup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
