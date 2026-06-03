// ══════════════════════════════════════════
//   TRACKVIEW.JS
// ══════════════════════════════════════════

import { getTrackById, CRITERIA, currentUser } from '../store.js';
import { RatingWidget } from '../components/RatingWidget.js';
import { formatTime } from '../utils.js';

export async function TrackView(trackId) {
	const container = document.createElement('div');
	container.className = 'page';

	const track = await getTrackById(trackId);

	if (!track) {
		container.innerHTML = `
      <div class="empty-state" style="padding-top:200px">
        <div class="empty-state-icon">❌</div>
        <h2 class="empty-state-title">Трек не найден</h2>
        <a href="#feed" class="btn btn--ghost" style="margin-top:8px">На главную</a>
      </div>`;
		return { element: container };
	}

	const breakdownRows = CRITERIA.map(({ key, label }) => {
		const val = track.ratingBreakdown?.[key] || 0;
		return `
      <div class="criteria-row">
        <div class="criteria-label">${label}</div>
        <div class="criteria-bar-wrap">
          <div class="criteria-bar-fill" style="width:${val * 10}%"></div>
        </div>
        <div class="criteria-val">${val.toFixed(1)}</div>
      </div>`;
	}).join('');

	const isOwn = currentUser?.uid === track.uploadedBy;

	container.innerHTML = `
    <div class="track-page">

      <!-- ЛЕВАЯ КОЛОНКА -->
      <div class="track-sidebar">
        <div class="track-cover-placeholder"
          style="${track.coverUrl ? `background:url('${track.coverUrl}') center/cover;` : ''}">
          ${track.coverUrl ? '' : '🎵'}
        </div>

        <div class="audio-player">
          <div class="player-controls">
            <button class="player-play-btn" id="play-btn">▶</button>
            <div class="player-time">
              <span id="cur-time">0:00</span> / <span id="dur-time">0:00</span>
            </div>
          </div>
          <div class="player-progress" id="progress-bar">
            <div class="player-progress-fill" id="progress-fill"></div>
          </div>
          <div class="player-volume">
            <span>🔊</span>
            <input type="range" min="0" max="100" value="100" id="vol-slider">
          </div>
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px">
          <div class="section-label" style="margin-bottom:14px">Разбивка оценок</div>
          ${breakdownRows}
        </div>
      </div>

      <!-- ПРАВАЯ КОЛОНКА -->
      <div class="track-main">
        <div class="track-info">
          <h1 class="track-info-title">${track.title}</h1>
          <div class="track-info-author" style="margin:10px 0 16px;display:flex;align-items:center;gap:8px">
            <span style="color:var(--text-2)">👤</span>
            <a href="#profile/${track.uploadedBy}" style="color:var(--text-2);transition:color .15s"
               onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-2)'">
              ${track.uploadedByName || track.artist || 'Неизвестно'}
            </a>
            ${isOwn ? '<span style="font-size:11px;background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:99px;border:1px solid rgba(232,255,71,.2)">Мой трек</span>' : ''}
          </div>
          ${track.description ? `<p style="color:var(--text-2);line-height:1.8;margin-bottom:16px">${track.description}</p>` : ''}
          <div class="track-info-tags">
            ${track.genre ? `<span class="tag">🎸 ${track.genre}</span>` : ''}
            <span class="tag" id="rating-tag">⭐ ${track.totalRatings || 0} оценок</span>
          </div>
        </div>

        <div class="track-total-score">
          <div class="track-total-score-num" id="avg-score">
            ${track.averageRating ? track.averageRating.toFixed(1) : '—'}
          </div>
          <div class="track-total-score-info">
            <div class="track-total-score-title">Средняя оценка</div>
            <div class="track-total-score-count" id="total-count">${track.totalRatings || 0} оценок</div>
          </div>
        </div>

        <div id="rating-widget-container"></div>
      </div>
    </div>`;

	// ── Плеер ──
	const audio = new Audio(track.audioUrl);
	const playBtn = container.querySelector('#play-btn');
	const progBar = container.querySelector('#progress-bar');
	const progFill = container.querySelector('#progress-fill');
	const curTime = container.querySelector('#cur-time');
	const durTime = container.querySelector('#dur-time');
	const volSlid = container.querySelector('#vol-slider');

	playBtn.addEventListener('click', () => {
		audio.paused ? (audio.play(), playBtn.textContent = '⏸') : (audio.pause(), playBtn.textContent = '▶');
	});
	audio.addEventListener('loadedmetadata', () => { durTime.textContent = formatTime(audio.duration); });
	audio.addEventListener('timeupdate', () => {
		curTime.textContent = formatTime(audio.currentTime);
		progFill.style.width = (audio.duration ? audio.currentTime / audio.duration * 100 : 0) + '%';
	});
	audio.addEventListener('ended', () => { playBtn.textContent = '▶'; });
	progBar.addEventListener('click', e => {
		const r = progBar.getBoundingClientRect();
		audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
	});
	volSlid.addEventListener('input', e => { audio.volume = e.target.value / 100; });

	// ── Виджет оценки ──
	const rw = container.querySelector('#rating-widget-container');
	rw.appendChild(await RatingWidget(trackId, (newAvg, newCount) => {
		container.querySelector('#avg-score').textContent = newAvg.toFixed(1);
		container.querySelector('#total-count').textContent = `${newCount} оценок`;
		container.querySelector('#rating-tag').textContent = `⭐ ${newCount} оценок`;
	}));

	return {
		element: container,
		cleanup: () => audio.pause(),
	};
}