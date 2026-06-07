// ══════════════════════════════════════════
//   TRACKCARD.JS
// ══════════════════════════════════════════

import { goToView } from '../router.js';
import { playTrack, getCurrentTrackId, isPlaying } from '../player.js';
import { Icons } from '../icons.js';

const GENRE_COLORS = {
  'Trap': '#a78bfa', 'Drill': '#f87171', 'Phonk': '#fb923c', 'R&B': '#f472b6',
  'Soul': '#fb7185', 'Neo-Soul': '#e879f9', 'Boom Bap': '#60a5fa', 'Jazz Rap': '#34d399',
  'Lo-Fi Рэп': '#94a3b8', 'Cloud Rap': '#7dd3fc', 'Рэп': '#e8ff47',
  'Хип-Хоп': '#facc15', 'Hardcore Рэп': '#ef4444', 'Conscious Rap': '#4ade80',
  'Gangsta Rap': '#f97316', 'Alternative Rap': '#c084fc', 'Pop Rap': '#fb64b6',
  'Crunk': '#ff6b35', 'Mumble Rap': '#a3e635',
};

export function TrackCard(track) {
  const el = document.createElement('div');
  el.className = 'track-card';

  const rating = track.averageRating || 0;
  const hasRating = track.totalRatings > 0;
  const gColor = GENRE_COLORS[track.genre];

  el.innerHTML = `
    <div class="track-card-cover"
      ${track.coverUrl ? `style="background-image:url('${track.coverUrl}')"` : ''}>
      ${track.coverUrl ? '' : `<span class="track-card-cover-icon">${Icons.music}</span>`}
      <button class="track-card-play" data-play aria-label="Слушать">${Icons.play}</button>
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
          <div class="score-label">${hasRating ? `${track.totalRatings} оц.` : 'нет'}</div>
        </div>
      </div>
      ${track.genre ? `
        <div class="track-card-genre">
          <span class="track-card-genre-dot" style="background:${gColor || 'var(--text-3)'}"></span>
          ${track.genre}
        </div>` : ''}
    </div>`;

  el.querySelector('[data-play]').addEventListener('click', e => {
    e.stopPropagation();
    playTrack(track);
    const btn = el.querySelector('[data-play]');
    const mine = getCurrentTrackId() === track.id;
    btn.innerHTML = (mine && isPlaying()) ? Icons.pause : Icons.play;
  });

  el.addEventListener('click', e => {
    if (e.target.closest('[data-play]')) return;
    goToView('track', track.id);
  });

  el.querySelector('.track-card-author').addEventListener('click', e => {
    if (track.uploadedBy) { e.stopPropagation(); goToView('profile', track.uploadedBy); }
  });

  return el;
}