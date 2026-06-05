import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
	apiKey: "AIzaSyDEDlJjrkwM6mjEZsvsw8yjELTyLb3npyU",
	authDomain: "rateform-6b428.firebaseapp.com",
	projectId: "rateform-6b428",
	storageBucket: "rateform-6b428.firebasestorage.app",
	messagingSenderId: "921681901951",
	appId: "1:921681901951:web:f6467313f92aec4ce3c24a",
	measurementId: "G-ZM83DXKSZC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

auth.languageCode = 'ru';

console.log('%c🔥 Firebase подключён', 'color:#e8ff47; font-weight:bold');