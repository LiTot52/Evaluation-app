// ══════════════════════════════════════════
//   TRACKCARD.JS
// ══════════════════════════════════════════

import { goToView } from '../router.js';
import { playTrack, getCurrentTrackId, isPlaying } from '../player.js';

export function TrackCard(track) {
  const el = document.createElement('div');
  el.className = 'track-card';

  const rating = track.averageRating || 0;
  const hasRating = track.totalRatings > 0;

  el.innerHTML = `
    <div class="track-card-cover"
      ${track.coverUrl ? `style="background-image:url('${track.coverUrl}')"` : ''}>
      ${track.coverUrl ? '' : '<span class="track-card-cover-emoji">🎵</span>'}
      <button class="track-card-play" data-play aria-label="Слушать">▶</button>
    </div>
    <div class="track-card-body">
      <div class="track-card-top">
        <div class="track-card-text">
          <div class="track-card-title">${track.title || 'Без названия'}</div>
          <div class="track-card-author">
            ${track.uploadedByName || track.artist || '?'}
            ${track.featArtists?.length ? `<span class="track-card-feat"> feat. ${track.featArtists.join(', ')}</span>` : ''}
          </div>
        </div>
        <div class="score-badge ${!hasRating ? 'score-badge--empty' : ''}">
          <div class="score-num">${hasRating ? rating.toFixed(1) : '—'}</div>
          <div class="score-label">${hasRating ? track.totalRatings : 'нет'}</div>
        </div>
      </div>
      ${track.genre ? `<div class="track-card-genre">${track.genre}</div>` : ''}
    </div>`;

  // Клик по обложке / play
  el.querySelector('[data-play]').addEventListener('click', e => {
    e.stopPropagation();
    playTrack(track);
    // Обновляем иконку
    const btn = el.querySelector('[data-play]');
    const isMine = getCurrentTrackId() === track.id;
    btn.textContent = (isMine && isPlaying()) ? '⏸' : '▶';
  });

  // Клик по карточке — переходим на страницу трека
  el.addEventListener('click', e => {
    if (e.target.closest('[data-play]')) return;
    goToView('track', track.id);
  });

  // Ссылка на профиль
  el.querySelector('.track-card-author').addEventListener('click', e => {
    if (track.uploadedBy) {
      e.stopPropagation();
      goToView('profile', track.uploadedBy);
    }
  });

  return el;
}