// ══════════════════════════════════════════
//   PLAYLISTVIEW.JS — Лайкнутые треки
// ══════════════════════════════════════════

import { getLikedTracks, currentUser } from '../store.js';
import { TrackCard } from '../components/TrackCard.js';
import { playTrack } from '../player.js';
import { Icons } from '../icons.js';

export async function PlaylistView() {
	const container = document.createElement('div');
	container.className = 'page';

	if (!currentUser) {
		container.innerHTML = `
      <div class="empty-state" style="padding-top:160px">
        <div class="empty-state-icon">${Icons.lock}</div>
        <h2 class="empty-state-title">Требуется вход</h2>
        <p class="empty-state-text">Войдите, чтобы видеть свой плейлист</p>
      </div>`;
		return { element: container };
	}

	container.innerHTML = `
    <div>
      <div class="playlist-page-header">
        <div>
          <h1 class="page-title">Мой <span>плейлист</span></h1>
          <p class="playlist-subtitle">Треки которым ты поставил лайк</p>
        </div>
        <div class="playlist-actions" id="playlist-actions" style="display:none">
          <button class="btn btn--primary" id="btn-play-all">
            ${Icons.play} Слушать всё
          </button>
        </div>
      </div>
      <div id="playlist-content">
        <div class="loader" style="min-height:200px"><div class="loader-spinner"></div></div>
      </div>
    </div>`;

	const content = container.querySelector('#playlist-content');

	const tracks = await getLikedTracks(currentUser.uid);

	if (tracks.length === 0) {
		content.innerHTML = `
      <div class="empty-state" style="padding:60px 0">
        <div class="empty-state-icon">${Icons.heart}</div>
        <h2 class="empty-state-title">Плейлист пуст</h2>
        <p class="empty-state-text">Ставь лайки трекам в ленте — они появятся здесь</p>
        <a href="#feed" class="btn btn--primary" style="margin-top:12px">Перейти в ленту</a>
      </div>`;
		return { element: container };
	}

	// Показываем кнопку «Слушать всё»
	const actionsEl = container.querySelector('#playlist-actions');
	actionsEl.style.display = 'flex';

	// Список треков в табличном виде
	content.innerHTML = `
    <div class="playlist-meta">
      <span class="playlist-count">${tracks.length} ${_plural(tracks.length, 'трек', 'трека', 'треков')}</span>
    </div>
    <div class="playlist-list" id="playlist-list"></div>`;

	const list = content.querySelector('#playlist-list');
	tracks.forEach((track, idx) => {
		const row = document.createElement('div');
		row.className = 'playlist-row';
		row.dataset.id = track.id;

		const rating = track.averageRating || 0;
		const hasRating = track.totalRatings > 0;
		const coverBg = track.coverUrl ? `style="background-image:url('${track.coverUrl}')"` : '';
		const featStr = track.featArtists?.length ? ` feat. ${track.featArtists.join(', ')}` : '';

		row.innerHTML = `
      <div class="playlist-row-num">${idx + 1}</div>
      <div class="playlist-row-cover" ${coverBg}>
        ${track.coverUrl ? '' : `<span>${Icons.music}</span>`}
        <button class="playlist-row-play" data-play>${Icons.play}</button>
      </div>
      <div class="playlist-row-info">
        <div class="playlist-row-title">${track.title}${featStr ? `<span class="track-card-feat">${featStr}</span>` : ''}</div>
        <div class="playlist-row-artist">${track.uploadedByName || track.artist || '?'}</div>
      </div>
      <div class="playlist-row-genre">${track.genre || ''}</div>
      <div class="playlist-row-score ${!hasRating ? 'score-badge--empty' : ''}">
        ${hasRating ? rating.toFixed(1) : '—'}
      </div>
      <div class="playlist-row-plays">${track.playCount || 0}</div>`;

		// Play кнопка
		row.querySelector('[data-play]').addEventListener('click', e => {
			e.stopPropagation();
			playTrack(track);
		});

		// Клик по строке — переход на трек
		row.addEventListener('click', e => {
			if (e.target.closest('[data-play]')) return;
			window.location.hash = `#track/${track.id}`;
		});

		list.appendChild(row);
	});

	// Слушать всё
	container.querySelector('#btn-play-all').addEventListener('click', () => {
		if (tracks.length > 0) playTrack(tracks[0]);
	});

	return { element: container };
}

function _plural(n, one, few, many) {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
	return `${n} ${many}`;
}