// ══════════════════════════════════════════
//   PLAYER.JS — Глобальный плеер
// ══════════════════════════════════════════

import { formatTime } from './utils.js';

let _audio = null;
let _trackId = null;
let _onDestroy = null;

// Создаём DOM плеера один раз
function _buildDOM() {
	if (document.getElementById('global-player')) return;
	const el = document.createElement('div');
	el.id = 'global-player';
	el.innerHTML = `
		<div class="gp-cover" id="gp-cover">🎵</div>
		<div class="gp-info">
			<div class="gp-title" id="gp-title">—</div>
			<div class="gp-artist" id="gp-artist">—</div>
		</div>
		<div class="gp-controls">
			<button class="gp-play-btn" id="gp-play">▶</button>
		</div>
		<div class="gp-progress-wrap">
			<div class="gp-progress" id="gp-progress">
				<div class="gp-progress-fill" id="gp-fill"></div>
			</div>
		</div>
		<div class="gp-time" id="gp-time">0:00 / 0:00</div>
		<div class="gp-volume">
			<span>🔊</span>
			<input type="range" id="gp-vol" min="0" max="100" value="100">
		</div>
		<button class="gp-close" id="gp-close" title="Закрыть">✕</button>`;
	document.body.appendChild(el);

	document.getElementById('gp-play').addEventListener('click', togglePlay);
	document.getElementById('gp-close').addEventListener('click', stop);
	document.getElementById('gp-vol').addEventListener('input', e => {
		if (_audio) _audio.volume = e.target.value / 100;
	});
	document.getElementById('gp-progress').addEventListener('click', e => {
		if (!_audio) return;
		const r = e.currentTarget.getBoundingClientRect();
		_audio.currentTime = (e.clientX - r.left) / r.width * _audio.duration;
	});
	document.getElementById('gp-title').addEventListener('click', () => {
		if (_trackId) window.location.hash = `#track/${_trackId}`;
	});
	document.getElementById('gp-cover').addEventListener('click', () => {
		if (_trackId) window.location.hash = `#track/${_trackId}`;
	});
}

export function playTrack(track) {
	_buildDOM();

	// Если тот же трек — просто toggle
	if (_trackId === track.id && _audio) { togglePlay(); return; }

	// Останавливаем предыдущий
	if (_audio) { _audio.pause(); _audio = null; }
	_onDestroy?.();
	_onDestroy = null;

	_trackId = track.id;
	_audio = new Audio(track.audioUrl);
	_audio.volume = (document.getElementById('gp-vol')?.value ?? 100) / 100;

	// Обновляем UI
	const cover = document.getElementById('gp-cover');
	const title = document.getElementById('gp-title');
	const artist = document.getElementById('gp-artist');
	const fill = document.getElementById('gp-fill');
	const time = document.getElementById('gp-time');
	const playBtn = document.getElementById('gp-play');
	const player = document.getElementById('global-player');

	title.textContent = track.title + (track.featArtists?.length ? ` feat. ${track.featArtists.join(', ')}` : '');
	artist.textContent = track.uploadedByName || track.artist || '—';

	if (track.coverUrl) {
		cover.style.backgroundImage = `url('${track.coverUrl}')`;
		cover.textContent = '';
	} else {
		cover.style.backgroundImage = '';
		cover.textContent = '🎵';
	}

	player.classList.add('active');
	playBtn.textContent = '⏸';

	_audio.addEventListener('loadedmetadata', () => {
		time.textContent = `0:00 / ${formatTime(_audio.duration)}`;
	});
	_audio.addEventListener('timeupdate', () => {
		if (!_audio) return;
		const pct = _audio.duration ? _audio.currentTime / _audio.duration * 100 : 0;
		fill.style.width = pct + '%';
		time.textContent = `${formatTime(_audio.currentTime)} / ${formatTime(_audio.duration || 0)}`;
	});
	_audio.addEventListener('ended', () => {
		playBtn.textContent = '▶';
		fill.style.width = '0%';
	});

	_audio.play().catch(err => console.warn('Autoplay blocked:', err));
}

export function togglePlay() {
	if (!_audio) return;
	const btn = document.getElementById('gp-play');
	if (_audio.paused) {
		_audio.play();
		if (btn) btn.textContent = '⏸';
	} else {
		_audio.pause();
		if (btn) btn.textContent = '▶';
	}
}

export function stop() {
	if (_audio) { _audio.pause(); _audio = null; }
	_trackId = null;
	const player = document.getElementById('global-player');
	if (player) player.classList.remove('active');
}

export function getCurrentTrackId() { return _trackId; }

export function isPlaying() { return _audio && !_audio.paused; }

// Вызывается из TrackView чтобы синхронизировать локальный плеер с глобальным
export function registerLocalCleanup(fn) { _onDestroy = fn; }