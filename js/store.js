// ══════════════════════════════════════════
//   STORE.JS
// ══════════════════════════════════════════

import { auth, db, storage } from './firebase-config.js';
import {
	signInWithEmailAndPassword, createUserWithEmailAndPassword,
	signOut, onAuthStateChanged, GoogleAuthProvider,
	signInWithPopup, updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
	collection, doc, getDoc, setDoc, getDocs,
	addDoc, query, where, onSnapshot, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
	ref, uploadBytesResumable, getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

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
	const { user } = await signInWithPopup(auth, provider);
	const snap = await getDoc(doc(db, 'users', user.uid));
	if (!snap.exists()) {
		await setDoc(doc(db, 'users', user.uid), {
			uid: user.uid,
			username: user.displayName || user.email.split('@')[0],
			email: user.email, avatar: user.photoURL || null,
			createdAt: new Date(), uploadsCount: 0, ratingsCount: 0,
		});
	}
	return user;
}

export function logoutUser() { return signOut(auth); }

export function onAuthChange(callback) {
	onAuthStateChanged(auth, (user) => { currentUser = user; callback(user); });
}

// ─────────────────────────────────────────
// ТРЕКИ  (сортируем на клиенте — не нужен индекс Firestore)
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

// Подписка на реалтайм (без orderBy — сортировка на клиенте)
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

// Треки конкретного пользователя
export async function getTracksByUser(uid) {
	const snap = await getDocs(
		query(collection(db, 'tracks'), where('uploadedBy', '==', uid))
	);
	return _sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// Топ треков — сортировка на клиенте
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
// ЗАГРУЗКА
// ─────────────────────────────────────────
export async function uploadTrack({ title, artist, genre, description, audioFile, coverFile }, onProgress) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	const trackId = `track_${Date.now()}_${currentUser.uid}`;

	const audioUrl = await _uploadFile(
		ref(storage, `tracks/${trackId}/audio`), audioFile,
		p => onProgress?.('audio', p)
	);
	const coverUrl = await _uploadFile(
		ref(storage, `tracks/${trackId}/cover`), coverFile,
		p => onProgress?.('cover', p)
	);

	const breakdown = Object.fromEntries(CRITERIA.map(c => [c.key, 0]));
	const trackData = {
		title, artist, genre: genre || 'Рэп',
		description: description || '',
		uploadedBy: currentUser.uid,
		uploadedByName: currentUser.displayName || currentUser.email,
		audioUrl, coverUrl,
		averageRating: 0, totalRatings: 0,
		ratingBreakdown: breakdown,
		createdAt: new Date(),
	};

	const ref2 = await addDoc(collection(db, 'tracks'), trackData);

	// Счётчик загрузок
	const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
	if (uSnap.exists()) {
		await updateDoc(doc(db, 'users', currentUser.uid), {
			uploadsCount: (uSnap.data().uploadsCount || 0) + 1,
		});
	}

	return { id: ref2.id, ...trackData };
}

function _uploadFile(storageRef, file, onProgress) {
	return new Promise((resolve, reject) => {
		const task = uploadBytesResumable(storageRef, file);
		task.on('state_changed',
			s => onProgress?.(Math.round(s.bytesTransferred / s.totalBytes * 100)),
			reject,
			async () => resolve(await getDownloadURL(task.snapshot.ref))
		);
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

	// Пересчитываем и возвращаем актуальные данные трека
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

console.log('%c✅ Store ready', 'color:#e8ff47;font-weight:bold');