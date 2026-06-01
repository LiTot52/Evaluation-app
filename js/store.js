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
				rhymes: 0,
				structure: 0,
				style: 0,
				charisma: 0,
				vibe: 0
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
		const overallRating = (ratings.rhymes + ratings.structure + ratings.style + ratings.charisma + ratings.vibe) / 5;

		// Save rating
		await setDoc(doc(db, 'ratings', ratingId), {
			trackId,
			userId: currentUser.uid,
			rhymes: ratings.rhymes,
			structure: ratings.structure,
			style: ratings.style,
			charisma: ratings.charisma,
			vibe: ratings.vibe,
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
					rhymes: 0,
					structure: 0,
					style: 0,
					charisma: 0,
					vibe: 0
				}
			});
			return;
		}

		const ratings = ratingsSnapshot.docs.map(doc => doc.data());
		const totalRatings = ratings.length;

		const avgRhymes = ratings.reduce((sum, r) => sum + r.rhymes, 0) / totalRatings;
		const avgStructure = ratings.reduce((sum, r) => sum + r.structure, 0) / totalRatings;
		const avgStyle = ratings.reduce((sum, r) => sum + r.style, 0) / totalRatings;
		const avgCharisma = ratings.reduce((sum, r) => sum + r.charisma, 0) / totalRatings;
		const avgVibe = ratings.reduce((sum, r) => sum + r.vibe, 0) / totalRatings;
		const avgRating = (avgRhymes + avgStructure + avgStyle + avgCharisma + avgVibe) / 5;

		await updateDoc(doc(db, 'tracks', trackId), {
			averageRating: Math.round(avgRating * 10) / 10,
			totalRatings,
			ratingBreakdown: {
				rhymes: Math.round(avgRhymes * 10) / 10,
				structure: Math.round(avgStructure * 10) / 10,
				style: Math.round(avgStyle * 10) / 10,
				charisma: Math.round(avgCharisma * 10) / 10,
				vibe: Math.round(avgVibe * 10) / 10
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
