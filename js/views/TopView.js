import { getTopTracks } from '../store.js';
import { goToView } from '../router.js';
import { Icons } from '../icons.js';

export async function TopView() {
  const container = document.createElement('div');
  container.className = 'page';
  const topTracks = await getTopTracks(50);

  if (topTracks.length === 0) {
    container.innerHTML = `
      <h1 class="page-title">Топ <span>Треков</span></h1>
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.trophy}</div>
        <h2 class="empty-state-title">Пока нет оценённых треков</h2>
        <p class="empty-state-text">Оцени треки в ленте — они появятся здесь</p>
        <a href="#feed" class="btn btn--primary" style="margin-top:8px">Перейти в ленту</a>
      </div>`;
    return { element: container };
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rows = topTracks.map((track, i) => {
    const rank = i + 1;
    const coverStyle = track.coverUrl ? `background-image:url('${track.coverUrl}')` : '';
    return `
      <div class="top-item ${rank <= 3 ? 'top-item--podium' : ''}" data-id="${track.id}">
        <div class="top-rank top-rank--${rank <= 3 ? rank : ''}">${rank <= 3 ? medals[rank - 1] : rank}</div>
        <div class="top-cover" style="${coverStyle}">${track.coverUrl ? '' : Icons.music}</div>
        <div class="top-info">
          <div class="top-title">${track.title}</div>
          <div class="top-author">
            <a href="#profile/${track.uploadedBy}" onclick="event.stopPropagation()">
              ${track.uploadedByName || track.artist || '?'}
            </a>
            ${track.genre ? `· ${track.genre}` : ''}
          </div>
        </div>
        <div class="top-score">${track.averageRating?.toFixed(1)}</div>
        <div style="font-size:12px;color:var(--text-3);min-width:50px;text-align:right">${track.totalRatings} оц.</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <h1 class="page-title">Топ <span>Треков</span></h1>
    <div class="top-list">${rows}</div>`;

  container.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (!e.target.closest('a')) goToView('track', el.dataset.id);
    });
  });

  return { element: container };
}