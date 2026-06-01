

import { db, auth } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { TrackCard } from '../components/TrackCard.js';
import { goToView } from '../router.js';

export async function ProfileView(userId) {
	const container = document.createElement('div');
	container.className = 'page';

	try {

		const userDoc = await getDoc(doc(db, 'users', userId));
		if (!userDoc.exists()) {
			container.innerHTML = `
				<div class="empty-state" style="padding-top: 200px;">
					<div class="empty-state-icon">👤</div>
					<h2 class="empty-state-title">Музыкант не найден</h2>
				</div>
			`;
			return { element: container };
		}

		const user = { ...userDoc.data(), id: userDoc.id };


		const tracksQuery = query(collection(db, 'tracks'), where('uploadedBy', '==', userId));
		const tracksSnapshot = await getDocs(tracksQuery);
		const userTracks = tracksSnapshot.docs.map(doc => ({
			...doc.data(),
			id: doc.id
		})).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));


		const totalRatingsReceived = userTracks.reduce((sum, track) => sum + (track.totalRatings || 0), 0);
		const avgRating = userTracks.length > 0
			? (userTracks.reduce((sum, track) => sum + (track.averageRating || 0), 0) / userTracks.length).toFixed(1)
			: 0;

		const isOwnProfile = auth.currentUser?.uid === userId;

		container.innerHTML = `
			<div>
				<!-- Заголовок профиля -->
				<div class="profile-header">
					<div class="profile-avatar" style="${user.avatar ? `background-image: url('${user.avatar}'); background-size: cover;` : 'background: var(--accent-dim);'} ${user.avatar ? '' : 'font-size: 40px;'} ${user.avatar ? '' : 'color: var(--accent);'}">
						${user.avatar ? '' : user.username?.[0]?.toUpperCase() || '👤'}
					</div>

					<div class="profile-info">
						<h1 class="profile-name">${user.username}</h1>
						<div class="profile-stats">
							<div>
								<span class="profile-stat-val">${userTracks.length}</span>
								<span> трек${userTracks.length === 1 ? '' : 'ов'}</span>
							</div>
							<div>
								<span class="profile-stat-val">${totalRatingsReceived}</span>
								<span> оценок</span>
							</div>
							<div>
								<span class="profile-stat-val">${avgRating}</span>
								<span> средняя оценка</span>
							</div>
						</div>
					</div>

					${isOwnProfile ? `
						<button class="btn btn--ghost" onclick="document.getElementById('edit-profile-modal').classList.add('open')">
							✎ Редактировать профиль
						</button>
					` : ''}
				</div>

				<!-- Треки пользователя -->
				<h2 class="page-title">Треки</h2>
				${userTracks.length === 0 ? `
					<div class="empty-state" style="padding-top: 60px;">
						<div class="empty-state-icon">🎵</div>
						<h3 class="empty-state-title">Нет треков</h3>
						<p class="empty-state-text">${isOwnProfile ? 'Загрузи свой первый трек!' : 'У этого музыканта пока нет треков'}</p>
						${isOwnProfile ? `
							<button class="btn btn--primary" onclick="window.location.hash = '#upload'">
								Загрузить трек
							</button>
						` : ''}
					</div>
				` : `
					<div class="tracks-grid" id="tracks-grid"></div>
				`}
			</div>
		`;

		if (userTracks.length > 0) {
			const grid = container.querySelector('#tracks-grid');
			userTracks.forEach(track => {
				grid.appendChild(TrackCard(track));
			});
		}

	} catch (error) {
		console.error('Error loading profile:', error);
		container.innerHTML = `
			<div class="empty-state" style="padding-top: 200px;">
				<div class="empty-state-icon">❌</div>
				<h2 class="empty-state-title">Ошибка загрузки профиля</h2>
				<p>${error.message}</p>
			</div>
		`;
	}

	return { element: container };
}
