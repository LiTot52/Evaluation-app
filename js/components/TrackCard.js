// ══════════════════════════════════════════
//   TRACKCARD.JS
// ══════════════════════════════════════════

import { goToView } from '../router.js';

export function TrackCard(track) {
	const el = document.createElement('a');
	el.className = 'track-card';
	el.href = `#track/${track.id}`;

	const rating = track.averageRating || 0;
	const hasRating = track.totalRatings > 0;

	el.innerHTML = `
    <div class="track-card-cover-placeholder"
      ${track.coverUrl ? `style="background:url('${track.coverUrl}') center/cover;background-size:cover;"` : ''}>
      ${track.coverUrl ? '' : '🎵'}
      <div class="track-card-play-overlay">
        <button class="play-btn-circle" aria-label="Слушать">▶</button>
      </div>
    </div>
    <div class="track-card-body">
      <div class="track-card-meta">
        <div style="min-width:0">
          <h3 class="track-card-title">${track.title || 'Без названия'}</h3>
          <a class="track-card-author"
             href="#profile/${track.uploadedBy}"
             onclick="event.stopPropagation()">
            <div class="ava">${(track.uploadedByName || track.artist || '?')[0]?.toUpperCase()}</div>
            ${track.uploadedByName || track.artist || 'Неизвестно'}
          </a>
        </div>
        <div class="score-badge ${!hasRating ? 'score-badge--empty' : ''}">
          <div class="score-badge-num">${hasRating ? rating.toFixed(1) : '—'}</div>
          <div class="score-badge-label">${hasRating ? track.totalRatings : 'нет'}</div>
        </div>
      </div>
      <div class="track-card-stats">
        ${track.genre ? `<span>🎸 ${track.genre}</span>` : ''}
        <span>⭐ ${track.totalRatings || 0}</span>
      </div>
    </div>`;

	el.addEventListener('click', e => {
		// Не перехватывать клик по ссылке на профиль
		if (e.target.closest('.track-card-author')) return;
		e.preventDefault();
		goToView('track', track.id);
	});

	return el;
}