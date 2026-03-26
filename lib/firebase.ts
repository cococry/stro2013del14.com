import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCuZOQ-r1oXZkkyXDBT8etwzD-lUuAXdW4",
    authDomain: "stro2013del14.firebaseapp.com",
    projectId: "stro2013del14",
    storageBucket: "stro2013del14.firebasestorage.app",
    messagingSenderId: "534170744155",
    appId: "1:534170744155:web:2d1005098399dc9132d67e"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
