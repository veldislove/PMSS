// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Для логіну
import { getFirestore } from 'firebase/firestore'; // Для бази даних

// ВСТАВ СЮДИ СВОЇ ДАНІ З КОНСОЛІ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDFVKxj6NzqI31zHEdz_M4prrNTs45r2X8",
  authDomain: "pmss-lab6.firebaseapp.com",
  projectId: "pmss-lab6",
  storageBucket: "pmss-lab6.firebasestorage.app",
  messagingSenderId: "103441379774",
  appId: "1:103441379774:web:541c519c844c0703b589ef"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);