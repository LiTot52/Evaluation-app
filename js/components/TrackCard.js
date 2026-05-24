// ══════════════════════════════════════════
//   TRACKCARD.JS — Reusable Track Card
// ══════════════════════════════════════════

import { goToView } from '../router.js';

export function TrackCard(track) {
	const element = document.createElement('a');
	element.className = 'track-card';
	element.href = `#track/${track.id}`;

	const coverUrl = track.coverUrl || '';
	const title = track.title || 'Без названия';
	const artist = track.artist || 'Unknown';
	const rating = track.averageRating || 0;
	const totalRatings = track.totalRatings || 0;

	element.innerHTML = `
		<div class="track-card-cover-placeholder" ${coverUrl ? `style="background-image: url('${coverUrl}'); background-size: cover;"` : ''}>
			${!coverUrl ? '🎵' : ''}
			<div class="track-card-play-overlay">
				<button class="play-btn-circle" title="Слушать">▶</button>
			</div>
		</div>

		<div class="track-card-body">
			<div class="track-card-meta">
				<div>
					<h3 class="track-card-title">${title}</h3>
					<p class="track-card-author">${artist}</p>
				</div>
				<div class="score-badge ${rating === 0 ? 'score-badge--empty' : ''}">
					<div class="score-badge-num">${rating > 0 ? rating.toFixed(1) : '—'}</div>
					<div class="score-badge-label">${totalRatings > 0 ? totalRatings : 'Нет'}</div>
				</div>
			</div>

			<div class="track-card-stats">
				<span title="Оценок">⭐ ${totalRatings}</span>
				<span title="Жанр">🎸 ${track.genre || 'N/A'}</span>
			</div>
		</div>
	`;

	element.addEventListener('click', (e) => {
		e.preventDefault();
		goToView('track', track.id);
	});

	return element;
}
