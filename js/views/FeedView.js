import { tracks, subscribeToTracks } from '../store.js';
import { TrackCard } from '../components/TrackCard.js';

export async function FeedView() {
	const container = document.createElement('div');
	container.className = 'page';

	let unsubscribe = null;

	const renderFeed = () => {
		const sortedTracks = [...tracks].sort((a, b) => {
			return new Date(b.createdAt) - new Date(a.createdAt);
		});

		if (sortedTracks.length === 0) {
			container.innerHTML = `
				<div class="empty-state">
					<div class="empty-state-icon">🎵</div>
					<h2 class="empty-state-title">Нет треков</h2>
					<p class="empty-state-text">Будьте первым, кто загрузит трек!</p>
				</div>
			`;
			return;
		}

		container.innerHTML = `
			<div>
				<h1 class="page-title">Лента <span>Треков</span></h1>
				<div class="tracks-grid" id="tracks-grid"></div>
			</div>
		`;

		const grid = container.querySelector('#tracks-grid');
		sortedTracks.forEach(track => {
			grid.appendChild(TrackCard(track));
		});
	};

	renderFeed();

	unsubscribe = subscribeToTracks(renderFeed);

	return {
		element: container,
		cleanup: () => {
			if (unsubscribe) unsubscribe();
		}
	};
}
