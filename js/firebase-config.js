import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

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
export const storage = getStorage(app);


auth.languageCode = 'ru';

// ─────────────────────────────────────────
//  Локальный эмулятор (только для разработки)
//  Закомментируй эти строки перед деплоем!
// ─────────────────────────────────────────
// const IS_DEV = location.hostname === 'localhost';
// if (IS_DEV) {
//   connectAuthEmulator(auth,      'http://localhost:9099');
//   connectFirestoreEmulator(db,   'localhost', 8080);
//   connectStorageEmulator(storage,'localhost', 9199);
// }

console.log('%c🔥 Firebase подключён', 'color:#e8ff47; font-weight:bold');