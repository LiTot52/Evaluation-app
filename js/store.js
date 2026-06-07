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
	addDoc, query, where, onSnapshot, updateDoc, deleteDoc,
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
	{
		key: 'voice',
		label: 'Голос и подача',
		desc: 'Качество исполнения: интонация, дикция, уверенность и харизма артиста на микрофоне',
	},
	{
		key: 'lyrics',
		label: 'Текст и смысл',
		desc: 'Насколько интересны строчки? Есть ли образы, смысл и запоминающиеся моменты?',
	},
	{
		key: 'music',
		label: 'Музыка',
		desc: 'Качество бита или минуса: мелодия, ритм и общее звучание инструментала',
	},
	{
		key: 'blend',
		label: 'Сочетание',
		desc: 'Насколько гармонично голос артиста легёт на музыку — единство трека как целого',
	},
	{
		key: 'repeat',
		label: 'Репит-фактор',
		desc: 'Хочется ли слушать этот трек снова? Остаётся ли он в голове после прослушивания?',
	},
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
// ПРОФИЛЬ: никнейм и аватар
// ─────────────────────────────────────────
export async function updateUsername(newName) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');
	await updateProfile(currentUser, { displayName: newName });
	await updateDoc(doc(db, 'users', currentUser.uid), { username: newName });

	// Обновляем имя автора во всех его треках
	const snap = await getDocs(
		query(collection(db, 'tracks'), where('uploadedBy', '==', currentUser.uid))
	);
	const updates = snap.docs.map(d =>
		updateDoc(doc(db, 'tracks', d.id), { uploadedByName: newName })
	);
	await Promise.all(updates);
}

export async function updateAvatar(file) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');
	const url = await _uploadToCloudinary(file, 'image', null);
	await updateProfile(currentUser, { photoURL: url });
	await updateDoc(doc(db, 'users', currentUser.uid), { avatar: url });
	return url;
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
// РЕДАКТИРОВАНИЕ ТРЕКА (название, обложка)
// ─────────────────────────────────────────
export async function updateTrackInfo(trackId, { title, featArtists, genre, coverFile, audioFile } = {}) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	const snap = await getDoc(doc(db, 'tracks', trackId));
	if (!snap.exists()) throw new Error('Трек не найден');
	if (snap.data().uploadedBy !== currentUser.uid) throw new Error('Нет прав');

	const updates = {};
	if (title !== undefined) updates.title = title;
	if (featArtists !== undefined) updates.featArtists = featArtists;
	if (genre !== undefined) updates.genre = genre;

	if (coverFile) {
		updates.coverUrl = await _uploadToCloudinary(coverFile, 'image', null);
	}
	if (audioFile) {
		updates.audioUrl = await _uploadToCloudinary(audioFile, 'video', null);
	}

	await updateDoc(doc(db, 'tracks', trackId), updates);
	return updates;
}

// ─────────────────────────────────────────
// УДАЛЕНИЕ ТРЕКА
// ─────────────────────────────────────────
export async function deleteTrack(trackId) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	const snap = await getDoc(doc(db, 'tracks', trackId));
	if (!snap.exists()) throw new Error('Трек не найден');
	if (snap.data().uploadedBy !== currentUser.uid) throw new Error('Нет прав');

	// Удаляем все оценки трека
	const ratingsSnap = await getDocs(
		query(collection(db, 'ratings'), where('trackId', '==', trackId))
	);
	await Promise.all(ratingsSnap.docs.map(d => deleteDoc(d.ref)));

	// Удаляем сам трек
	await deleteDoc(doc(db, 'tracks', trackId));

	// Обновляем счётчик
	try {
		const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
		if (uSnap.exists()) {
			const count = Math.max(0, (uSnap.data().uploadsCount || 1) - 1);
			await updateDoc(doc(db, 'users', currentUser.uid), { uploadsCount: count });
		}
	} catch (e) {
		console.warn('Could not update uploadsCount:', e);
	}
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
export async function uploadTrack({ title, artist, featArtists, genre, description, audioFile, coverFile }, onProgress) {
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
		featArtists: featArtists || [],
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

		xhr.addEventListener('error', () => reject(new Error('Ошибка сети при загрузке на Cloudinary')));
		xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));

		xhr.send(formData);
	});
}

// ─────────────────────────────────────────
// ОЦЕНКИ (только не свои треки)
// ─────────────────────────────────────────
export async function getCurrentRating(trackId) {
	if (!currentUser) return null;
	const snap = await getDoc(doc(db, 'ratings', `${currentUser.uid}_${trackId}`));
	return snap.exists() ? snap.data() : null;
}

export async function rateTrack(trackId, scores) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');

	// Нельзя оценивать свой трек
	const trackSnap = await getDoc(doc(db, 'tracks', trackId));
	if (trackSnap.exists() && trackSnap.data().uploadedBy === currentUser.uid) {
		throw new Error('Нельзя оценивать собственный трек');
	}

	const keys = CRITERIA.map(c => c.key);
	const total = Math.round(keys.reduce((s, k) => s + (scores[k] || 0), 0) / keys.length * 10) / 10;

	await setDoc(doc(db, 'ratings', `${currentUser.uid}_${trackId}`), {
		trackId, userId: currentUser.uid,
		...scores, total, ratedAt: new Date(),
	});

	const result = await _recalcTrack(trackId);
	_notifyRated(trackId); // fire-and-forget
	return result;
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

// ─────────────────────────────────────────
// ЛАЙКИ
// ─────────────────────────────────────────
export async function likeTrack(trackId) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');
	const likeId = `${currentUser.uid}_${trackId}`;
	const ref = doc(db, 'likes', likeId);
	const snap = await getDoc(ref);
	if (snap.exists()) {
		await deleteDoc(ref);
		await updateDoc(doc(db, 'tracks', trackId), {
			likesCount: Math.max(0, (await getDoc(doc(db, 'tracks', trackId))).data().likesCount - 1)
		});
		return false; // unliked
	} else {
		await setDoc(ref, { trackId, userId: currentUser.uid, createdAt: new Date() });
		const tSnap = await getDoc(doc(db, 'tracks', trackId));
		await updateDoc(doc(db, 'tracks', trackId), {
			likesCount: (tSnap.data().likesCount || 0) + 1
		});
		return true; // liked
	}
}

export async function isLiked(trackId) {
	if (!currentUser) return false;
	const snap = await getDoc(doc(db, 'likes', `${currentUser.uid}_${trackId}`));
	return snap.exists();
}

// ─────────────────────────────────────────
// КОММЕНТАРИИ
// ─────────────────────────────────────────
export async function addComment(trackId, text) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');
	if (!text.trim()) throw new Error('Комментарий не может быть пустым');

	const ref = await addDoc(collection(db, 'comments'), {
		trackId,
		userId: currentUser.uid,
		userName: currentUser.displayName || currentUser.email.split('@')[0],
		userAvatar: currentUser.photoURL || null,
		text: text.trim(),
		createdAt: new Date(),
	});

	// Уведомление автору трека (если комментирует не сам автор)
	const tSnap = await getDoc(doc(db, 'tracks', trackId));
	if (tSnap.exists() && tSnap.data().uploadedBy !== currentUser.uid) {
		await addDoc(collection(db, 'notifications'), {
			toUid: tSnap.data().uploadedBy,
			fromUid: currentUser.uid,
			fromName: currentUser.displayName || currentUser.email.split('@')[0],
			type: 'comment',
			trackId,
			trackTitle: tSnap.data().title,
			text: text.trim().slice(0, 80),
			read: false,
			createdAt: new Date(),
		});
	}

	return {
		id: ref.id, trackId, userId: currentUser.uid,
		userName: currentUser.displayName || currentUser.email.split('@')[0],
		userAvatar: currentUser.photoURL || null,
		text: text.trim(), createdAt: new Date()
	};
}

export async function getComments(trackId) {
	const snap = await getDocs(
		query(collection(db, 'comments'), where('trackId', '==', trackId))
	);
	return snap.docs
		.map(d => ({ id: d.id, ...d.data() }))
		.sort((a, b) => {
			const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
			const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
			return ta - tb;
		});
}

export async function deleteComment(commentId) {
	if (!currentUser) throw new Error('Нужно войти в аккаунт');
	const snap = await getDoc(doc(db, 'comments', commentId));
	if (!snap.exists()) throw new Error('Комментарий не найден');
	if (snap.data().userId !== currentUser.uid) throw new Error('Нет прав');
	await deleteDoc(doc(db, 'comments', commentId));
}

// ─────────────────────────────────────────
// УВЕДОМЛЕНИЯ
// ─────────────────────────────────────────
export async function getNotifications() {
	if (!currentUser) return [];
	const snap = await getDocs(
		query(collection(db, 'notifications'), where('toUid', '==', currentUser.uid))
	);
	return snap.docs
		.map(d => ({ id: d.id, ...d.data() }))
		.sort((a, b) => {
			const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
			const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
			return tb - ta;
		});
}

export async function markNotificationsRead() {
	if (!currentUser) return;
	const snap = await getDocs(
		query(collection(db, 'notifications'),
			where('toUid', '==', currentUser.uid),
			where('read', '==', false))
	);
	await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

export function subscribeToNotifications(callback) {
	if (!currentUser) return () => { };
	return onSnapshot(
		query(collection(db, 'notifications'),
			where('toUid', '==', currentUser.uid),
			where('read', '==', false)),
		snap => callback(snap.size),
		err => console.warn('notifications subscribe error:', err)
	);
}

// ─────────────────────────────────────────
// ПОИСК
// ─────────────────────────────────────────
export async function searchTracks(q) {
	if (!q.trim()) return [];
	const snap = await getDocs(collection(db, 'tracks'));
	const lower = q.toLowerCase();
	return snap.docs
		.map(d => ({ id: d.id, ...d.data() }))
		.filter(t =>
			t.title?.toLowerCase().includes(lower) ||
			t.uploadedByName?.toLowerCase().includes(lower) ||
			t.artist?.toLowerCase().includes(lower) ||
			t.genre?.toLowerCase().includes(lower) ||
			t.featArtists?.some(f => f.toLowerCase().includes(lower))
		)
		.slice(0, 40);
}

// Уведомление при оценке (вызывается из rateTrack)
async function _notifyRated(trackId) {
	try {
		const tSnap = await getDoc(doc(db, 'tracks', trackId));
		if (!tSnap.exists()) return;
		const owner = tSnap.data().uploadedBy;
		if (owner === currentUser.uid) return;
		await addDoc(collection(db, 'notifications'), {
			toUid: owner,
			fromUid: currentUser.uid,
			fromName: currentUser.displayName || currentUser.email.split('@')[0],
			type: 'rating',
			trackId,
			trackTitle: tSnap.data().title,
			text: '',
			read: false,
			createdAt: new Date(),
		});
	} catch (e) { console.warn('notify error', e); }
}