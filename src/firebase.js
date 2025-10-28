// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC4281hfbdHYrxgJskWCOI-IwNurf-AvsU",
  authDomain: "todo-list-3937e.firebaseapp.com",
  projectId: "todo-list-3937e",
  storageBucket: "todo-list-3937e.firebasestorage.app",
  messagingSenderId: "909324969773",
  appId: "1:909324969773:web:8fa6c7930e17599ae515a4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default app;