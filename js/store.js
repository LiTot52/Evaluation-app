// ══════════════════════════════════════════
//   STORE.JS — State Management & Firestore
// ══════════════════════════════════════════

import { auth, db, storage } from './firebase-config.js';
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	GoogleAuthProvider,
	signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
	collection,
	doc,
	getDoc,
	setDoc,
	getDocs,
	addDoc,
	query,
	where,
	onSnapshot,
	updateDoc,
	deleteDoc,
	getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
	ref,
	uploadBytes,
	getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
export let currentUser = null;
export let tracks = [];
let listeners = [];

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export async function registerUser(email, username, password) {
	const userCredential = await createUserWithEmailAndPassword(auth, email, password);
	const uid = userCredential.user.uid;

	await setDoc(doc(db, 'users', uid), {
		uid,
		username,
		email,
		avatar: null,
		createdAt: new Date(),
		uploadsCount: 0,
		ratingsCount: 0
	});

	return userCredential.user;
}

export async function loginUser(email, password) {
	const userCredential = await signInWithEmailAndPassword(auth, email, password);
	return userCredential.user;
}

export async function loginWithGoogle() {
	const provider = new GoogleAuthProvider();
	const userCredential = await signInWithPopup(auth, provider);
	const uid = userCredential.user.uid;
	const email = userCredential.user.email;
	const username = userCredential.user.displayName || email.split('@')[0];

	const userDoc = await getDoc(doc(db, 'users', uid));
	if (!userDoc.exists()) {
		await setDoc(doc(db, 'users', uid), {
			uid,
			username,
			email,
			avatar: userCredential.user.photoURL || null,
			createdAt: new Date(),
			uploadsCount: 0,
			ratingsCount: 0
		});
	}

	return userCredential.user;
}

export async function logoutUser() {
	await signOut(auth);
	currentUser = null;
}

export function onAuthChange(callback) {
	onAuthStateChanged(auth, async (user) => {
		currentUser = user;
		callback(user);
	});
}

// ─────────────────────────────────────────
// TRACKS
// ─────────────────────────────────────────
export async function loadAllTracks() {
	try {
		const snapshot = await getDocs(collection(db, 'tracks'));
		tracks = snapshot.docs.map(doc => ({
			...doc.data(),
			id: doc.id
		}));
		notifyListeners();
		return tracks;
	} catch (error) {
		console.error('Error loading tracks:', error);
		throw error;
	}
}

export function subscribeToTracks(callback) {
	const unsubscribe = onSnapshot(collection(db, 'tracks'), (snapshot) => {
		tracks = snapshot.docs.map(doc => ({
			...doc.data(),
			id: doc.id
		}));
		callback(tracks);
		notifyListeners();
	});
	return unsubscribe;
}

export async function getTrackById(trackId) {
	try {
		const docSnap = await getDoc(doc(db, 'tracks', trackId));
		if (docSnap.exists()) {
			return { ...docSnap.data(), id: docSnap.id };
		}
		return null;
	} catch (error) {
		console.error('Error loading track:', error);
		throw error;
	}
}

// ─────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────
export async function uploadTrack(title, artist, genre, description, audioFile, coverFile) {
	if (!currentUser) throw new Error('User not authenticated');

	try {
		const trackId = `track_${Date.now()}`;

		// Upload audio
		const audioRef = ref(storage, `tracks/${trackId}/audio`);
		await uploadBytes(audioRef, audioFile);
		const audioUrl = await getDownloadURL(audioRef);

		// Upload cover
		const coverRef = ref(storage, `tracks/${trackId}/cover`);
		await uploadBytes(coverRef, coverFile);
		const coverUrl = await getDownloadURL(coverRef);

		// Get duration (basic, store as 0 for now - could be calculated on client)
		const audio = new Audio(audioUrl);
		const duration = await new Promise(resolve => {
			audio.onloadedmetadata = () => resolve(Math.round(audio.duration));
		});

		// Create track document
		const trackData = {
			title,
			artist,
			genre,
			description: description || '',
			uploadedBy: currentUser.uid,
			uploadedByName: currentUser.displayName || currentUser.email,
			audioUrl,
			coverUrl,
			averageRating: 0,
			totalRatings: 0,
			ratingBreakdown: {
				beat: 0,
				vocals: 0,
				production: 0,
				flow: 0
			},
			duration,
			createdAt: new Date()
		};

		const docRef = await addDoc(collection(db, 'tracks'), trackData);

		// Update user uploads count
		await updateDoc(doc(db, 'users', currentUser.uid), {
			uploadsCount: (await getDoc(doc(db, 'users', currentUser.uid))).data().uploadsCount + 1
		});

		return { ...trackData, id: docRef.id };
	} catch (error) {
		console.error('Error uploading track:', error);
		throw error;
	}
}

// ─────────────────────────────────────────
// RATING
// ─────────────────────────────────────────
export async function rateTrack(trackId, ratings) {
	if (!currentUser) throw new Error('User not authenticated');

	try {
		const ratingId = `${currentUser.uid}_${trackId}`;
		const overallRating = (ratings.beat + ratings.vocals + ratings.production + ratings.flow) / 4;

		// Save rating
		await setDoc(doc(db, 'ratings', ratingId), {
			trackId,
			userId: currentUser.uid,
			beat: ratings.beat,
			vocals: ratings.vocals,
			production: ratings.production,
			flow: ratings.flow,
			overallRating,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Recalculate track average
		await recalculateTrackRating(trackId);

		// Update user ratings count
		const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
		const ratingsCount = userDoc.data().ratingsCount || 0;
		await updateDoc(doc(db, 'users', currentUser.uid), {
			ratingsCount: ratingsCount + 1
		});

		return overallRating;
	} catch (error) {
		console.error('Error rating track:', error);
		throw error;
	}
}

export async function getCurrentRating(trackId) {
	if (!currentUser) return null;

	try {
		const ratingId = `${currentUser.uid}_${trackId}`;
		const docSnap = await getDoc(doc(db, 'ratings', ratingId));
		if (docSnap.exists()) {
			return docSnap.data();
		}
		return null;
	} catch (error) {
		console.error('Error getting current rating:', error);
		return null;
	}
}

async function recalculateTrackRating(trackId) {
	try {
		const ratingsQuery = query(collection(db, 'ratings'), where('trackId', '==', trackId));
		const ratingsSnapshot = await getDocs(ratingsQuery);

		if (ratingsSnapshot.empty) {
			await updateDoc(doc(db, 'tracks', trackId), {
				averageRating: 0,
				totalRatings: 0,
				ratingBreakdown: {
					beat: 0,
					vocals: 0,
					production: 0,
					flow: 0
				}
			});
			return;
		}

		const ratings = ratingsSnapshot.docs.map(doc => doc.data());
		const totalRatings = ratings.length;

		const avgBeat = ratings.reduce((sum, r) => sum + r.beat, 0) / totalRatings;
		const avgVocals = ratings.reduce((sum, r) => sum + r.vocals, 0) / totalRatings;
		const avgProduction = ratings.reduce((sum, r) => sum + r.production, 0) / totalRatings;
		const avgFlow = ratings.reduce((sum, r) => sum + r.flow, 0) / totalRatings;
		const avgRating = (avgBeat + avgVocals + avgProduction + avgFlow) / 4;

		await updateDoc(doc(db, 'tracks', trackId), {
			averageRating: Math.round(avgRating * 10) / 10,
			totalRatings,
			ratingBreakdown: {
				beat: Math.round(avgBeat * 10) / 10,
				vocals: Math.round(avgVocals * 10) / 10,
				production: Math.round(avgProduction * 10) / 10,
				flow: Math.round(avgFlow * 10) / 10
			}
		});
	} catch (error) {
		console.error('Error recalculating rating:', error);
	}
}

// ─────────────────────────────────────────
// LISTENERS
// ─────────────────────────────────────────
export function subscribe(callback) {
	listeners.push(callback);
	return () => {
		listeners = listeners.filter(l => l !== callback);
	};
}

function notifyListeners() {
	listeners.forEach(callback => callback());
}

console.log('%c✅ Store initialized', 'color:#e8ff47; font-weight:bold');
