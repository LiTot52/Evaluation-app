// ══════════════════════════════════════════
//   STORE.JS
// ══════════════════════════════════════════

import { auth, db } from './firebase-config.js';
import {
	signInWithEmailAndPassword, createUserWithEmailAndPassword,
	signOut, onAuthStateChanged, GoogleAuthProvider,
	signInWithPopup, updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
	collection, doc, getDoc, setDoc, getDocs,
	addDoc, query, where, onSnapshot, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─────────────────────────────────────────
// CLOUDINARY CONFIG
// ─────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'dyc4rspmf';
const CLOUDINARY_UPLOAD_PRESET = 'default';

// ─────────────────────────────────────────
// СОСТОЯНИЕ
// ─────────────────────────────────────────
export let currentUser = null;
export let tracks = [];

export const CRITERIA = [
	{ key: 'rhymes', label: 'Рифмы / образы' },
	{ key: 'structure', label: 'Структура / ритмика' },
	{ key: 'style', label: 'Реализация стиля' },
	{ key: 'charisma', label: 'Харизма' },
	{ key: 'vibe', label: 'Вайб' },
];

export const GENRES = [
	'Рэп', 'Хип-Хоп', 'Trap', 'Drill', 'Boom Bap',
	'Cloud Rap', 'Lo-Fi Рэп', 'Hardcore Рэп',
	'Conscious Rap', 'Gangsta Rap', 'Alternative Rap',
	'Jazz Rap', 'Phonk', 'R&B', 'Soul', 'Neo-Soul',
	'Pop Rap', 'Crunk', 'Mumble Rap', 'Другой',
];

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export async function registerUser(email, username, password) {
	const { user } = await createUserWithEmailAndPassword(auth, email, password);
	await updateProfile(user, { displayName: username });
	await setDoc(doc(db, 'users', user.uid), {
		uid: user.uid, username, email,
		avatar: null, createdAt: new Date(),
		uploadsCount: 0, ratingsCount: 0,
	});
	return user;
}

export async function loginUser(email, password) {
	const { user } = await signInWithEmailAndPassword(auth, email, password);
	return user;
}

export async function loginWithGoogle() {
	const provider = new GoogleAuthProvider();
	provider.addScope('profile');
	provider.addScope('email');
	const { user } = await signInWithPopup(auth, provider);
	const snap = await getDoc(doc(db, 'users', user.uid));
	if (!snap.exists()) {
		await setDoc(doc(db, 'users', user.uid), {
			uid: user.uid,
			username: user.displayName || user.email.split('@')[0],
			email: user.email,
			avatar: user.photoURL || null,
			createdAt: new Date(),
			uploadsCount: 0,
			ratingsCount: 0,
		});
	}
	return user;
}

export function logoutUser() { return signOut(auth); }

export function onAuthChange(callback) {
	onAuthStateChanged(auth, (user) => { currentUser = user; callback(user); });
}

// ─────────────────────────────────────────
// ТРЕКИ
// ─────────────────────────────────────────
const _sortByDate = (arr) =>
	[...arr].sort((a, b) => {
		const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
		const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
		return tb - ta;
	});

export async function loadAllTracks() {
	try {
		const snap = await getDocs(collection(db, 'tracks'));
		tracks = _sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
		return tracks;
	} catch (err) {
		console.error('loadAllTracks error:', err);
		return [];
	}
}

export function subscribeToTracks(callback) {
	return onSnapshot(
		collection(db, 'tracks'),
		(snap) => {
			tracks = _sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
			callback(tracks);
		},
		(err) => console.error('subscribeToTracks error:', err)
	);
}

export async function getTrackById(id) {
	const snap = await getDoc(doc(db, 'tracks', id));
	return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getTracksByUser(uid) {
	const snap = await getDocs(
		query(collection(db, 'tracks'), where('uploadedBy', '==', uid))
	);
	return _sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getTopTracks(n = 20) {
	const snap = await getDocs(collection(db, 'tracks'));
	return snap.docs
		.map(d => ({ id: d.id, ...d.data() }))
		.filter(t => t.totalRatings > 0)
		.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
		.slice(0, n);
}

// ─────────────────────────────────────────
// ПОЛЬЗОВАТЕЛИ
// ─────────────────────────────────────────
export async function getUserById(uid) {
	const snap = await getDoc(doc(db, 'users', uid));
	return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─────────────────────────────────────────
// ЗАГРУЗКА (Cloudinary)
// ─────────────────────────────────────────
export async function uploadTrack({ title, artist, genre, description, audioFile, coverFile }, onProgress) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	onProgress?.('audio', 0);
	const audioUrl = await _uploadToCloudinary(audioFile, 'video', (p) => {
		onProgress?.('audio', p);
	});

	onProgress?.('cover', 0);
	const coverUrl = await _uploadToCloudinary(coverFile, 'image', (p) => {
		onProgress?.('cover', p);
	});

	const breakdown = Object.fromEntries(CRITERIA.map(c => [c.key, 0]));
	const trackData = {
		title,
		artist,
		genre: genre || 'Рэп',
		description: description || '',
		uploadedBy: currentUser.uid,
		uploadedByName: currentUser.displayName || currentUser.email.split('@')[0],
		audioUrl,
		coverUrl,
		averageRating: 0,
		totalRatings: 0,
		ratingBreakdown: breakdown,
		createdAt: new Date(),
	};

	const docRef = await addDoc(collection(db, 'tracks'), trackData);

	try {
		const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
		if (uSnap.exists()) {
			await updateDoc(doc(db, 'users', currentUser.uid), {
				uploadsCount: (uSnap.data().uploadsCount || 0) + 1,
			});
		}
	} catch (e) {
		console.warn('Could not update uploadsCount:', e);
	}

	return { id: docRef.id, ...trackData };
}

// Загрузка файла на Cloudinary через XMLHttpRequest (с прогрессом)
function _uploadToCloudinary(file, resourceType, onProgress) {
	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
		formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

		const xhr = new XMLHttpRequest();
		const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

		xhr.open('POST', url, true);

		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) {
				const pct = Math.round((e.loaded / e.total) * 100);
				onProgress?.(pct);
			}
		});

		xhr.addEventListener('load', () => {
			if (xhr.status === 200) {
				try {
					const data = JSON.parse(xhr.responseText);
					resolve(data.secure_url);
				} catch {
					reject(new Error('Ошибка ответа Cloudinary'));
				}
			} else {
				try {
					const err = JSON.parse(xhr.responseText);
					reject(new Error(`Cloudinary: ${err.error?.message || xhr.status}`));
				} catch {
					reject(new Error(`Ошибка загрузки: ${xhr.status}`));
				}
			}
		});

		xhr.addEventListener('error', () => {
			reject(new Error('Ошибка сети при загрузке на Cloudinary'));
		});

		xhr.addEventListener('abort', () => {
			reject(new Error('Загрузка отменена'));
		});

		xhr.send(formData);
	});
}

// ─────────────────────────────────────────
// ОЦЕНКИ
// ─────────────────────────────────────────
export async function getCurrentRating(trackId) {
	if (!currentUser) return null;
	const snap = await getDoc(doc(db, 'ratings', `${currentUser.uid}_${trackId}`));
	return snap.exists() ? snap.data() : null;
}

export async function rateTrack(trackId, scores) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	const keys = CRITERIA.map(c => c.key);
	const total = Math.round(keys.reduce((s, k) => s + (scores[k] || 0), 0) / keys.length * 10) / 10;

	await setDoc(doc(db, 'ratings', `${currentUser.uid}_${trackId}`), {
		trackId, userId: currentUser.uid,
		...scores, total, ratedAt: new Date(),
	});

	return await _recalcTrack(trackId);
}

async function _recalcTrack(trackId) {
	const snap = await getDocs(
		query(collection(db, 'ratings'), where('trackId', '==', trackId))
	);
	if (snap.empty) return null;

	const all = snap.docs.map(d => d.data());
	const count = all.length;
	const breakdown = {};

	CRITERIA.forEach(({ key }) => {
		breakdown[key] = Math.round(
			all.reduce((s, r) => s + (r[key] || 0), 0) / count * 10
		) / 10;
	});

	const avg = Math.round(
		Object.values(breakdown).reduce((s, v) => s + v, 0) / CRITERIA.length * 10
	) / 10;

	await updateDoc(doc(db, 'tracks', trackId), {
		averageRating: avg, totalRatings: count, ratingBreakdown: breakdown,
	});

	return { averageRating: avg, totalRatings: count, ratingBreakdown: breakdown };
}

console.log('%c✅ Store ready (Cloudinary)', 'color:#e8ff47;font-weight:bold');