// ══════════════════════════════════════════
//   TOPVIEW.JS — Топ треков
// ══════════════════════════════════════════

import { getTopTracks } from '../store.js';
import { goToView } from '../router.js';

export async function TopView() {
	const container = document.createElement('div');
	container.className = 'page';

	const topTracks = await getTopTracks(50);

	if (topTracks.length === 0) {
		container.innerHTML = `
      <h1 class="page-title">Топ <span>Треков</span></h1>
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <h2 class="empty-state-title">Пока нет оценённых треков</h2>
        <p class="empty-state-text">Оцени треки в ленте — они появятся здесь</p>
        <a href="#feed" class="btn btn--primary" style="margin-top:8px">Перейти в ленту</a>
      </div>`;
		return { element: container };
	}

	const medals = ['🥇', '🥈', '🥉'];

	const rows = topTracks.map((track, i) => {
		const rank = i + 1;
		const rankDisp = rank <= 3 ? medals[rank - 1] : rank;
		const cover = track.coverUrl
			? `<img src="${track.coverUrl}" alt="${track.title}" class="top-cover">`
			: `<div class="top-cover" style="display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--surface)">🎵</div>`;

		return `
      <div class="top-item ${rank <= 3 ? 'top-item--podium' : ''}"
           onclick="window.location.hash='#track/${track.id}'"
           style="cursor:pointer">
        <div class="top-rank top-rank--${rank <= 3 ? rank : ''}">${rankDisp}</div>
        ${cover}
        <div class="top-info">
          <div class="top-title">${track.title}</div>
          <div class="top-author">
            <a href="#profile/${track.uploadedBy}" onclick="event.stopPropagation()">
              ${track.uploadedByName || track.artist || '?'}
            </a>
            · ${track.genre || ''}
          </div>
        </div>
        <div class="top-score">${track.averageRating?.toFixed(1)}</div>
        <div style="font-size:12px;color:var(--text-3);min-width:60px;text-align:right">
          ${track.totalRatings} оц.
        </div>
      </div>`;
	}).join('');

	container.innerHTML = `
    <h1 class="page-title">Топ <span>Треков</span></h1>
    <div class="top-list">${rows}</div>`;

	return { element: container };
}