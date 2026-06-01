import { getTrackById } from '../store.js';
import { RatingWidget } from '../components/RatingWidget.js';
import { showToast } from '../app.js';

export async function TrackView(trackId) {
	const container = document.createElement('div');
	container.className = 'page';

	const track = await getTrackById(trackId);

	if (!track) {
		container.innerHTML = `
			<div class="empty-state" style="padding-top: 200px;">
				<div class="empty-state-icon">❌</div>
				<h2 class="empty-state-title">Трек не найден</h2>
			</div>
		`;
		return { element: container };
	}

	container.innerHTML = `
		<div class="track-page">
			<!-- LEFT SIDEBAR -->
			<div class="track-sidebar">
				<!-- Cover -->
				<div class="track-cover-placeholder" style="background-image: url('${track.coverUrl}'); background-size: cover;">
					${!track.coverUrl ? '🎵' : ''}
				</div>

				<!-- Audio Player -->
				<div class="audio-player">
					<div class="player-controls">
						<button class="player-play-btn" id="play-btn">▶</button>
						<div class="player-time">
							<span id="current-time">0:00</span> / <span id="duration">0:00</span>
						</div>
					</div>

					<div class="player-progress" id="progress-bar">
						<div class="player-progress-fill" id="progress-fill"></div>
					</div>

					<div class="player-volume">
						<span>🔊</span>
						<input type="range" min="0" max="100" value="100" id="volume-slider">
					</div>
				</div>

				<!-- Criteria Breakdown -->
				<div class="criteria-breakdown" style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px;">
					<div style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 16px;">Разбивка по критериям</div>
					${['rhymes', 'structure', 'style', 'charisma', 'vibe'].map(criterion => `
						<div class="criteria-row">
							<div class="criteria-label">${{ rhymes: '✍️ Рифмы', structure: '🎼 Структура', style: '🎨 Стиль', charisma: '⚡ Харизма', vibe: '🌊 Вайб' }[criterion]}</div>
							<div class="criteria-bar-wrap">
								<div class="criteria-bar-fill" style="width: ${(track.ratingBreakdown?.[criterion] || 0) * 10}%"></div>
							</div>
							<div class="criteria-val">${(track.ratingBreakdown?.[criterion] || 0).toFixed(1)}</div>
						</div>
					`).join('')}
				</div>
			</div>

			<!-- RIGHT CONTENT -->
			<div class="track-main">
				<!-- Track Info -->
				<div class="track-info">
					<h1 class="track-info-title">${track.title}</h1>
					<div class="track-info-author" style="cursor: pointer; user-select: none;" onclick="window.location.hash = '#profile/${track.uploadedBy}'">
						<span>${track.uploadedByName || 'Unknown'}</span>
					</div>
					<p style="color: var(--text-2); line-height: 1.8; margin: 16px 0;">
						${track.description || 'Нет описания'}
					</p>
					<div class="track-info-tags">
						<span class="tag">${track.genre}</span>
						<span class="tag" id="stats">⭐ ${track.totalRatings} оценок</span>
					</div>
				</div>

				<!-- Total Score -->
				<div class="track-total-score">
					<div class="track-total-score-num">${(track.averageRating || 0).toFixed(1)}</div>
					<div class="track-total-score-info">
						<div class="track-total-score-title">Средняя оценка</div>
						<div class="track-total-score-count" id="ratings-count">${track.totalRatings} оценок</div>
					</div>
				</div>

				<!-- Rating Widget -->
				<div id="rating-widget-container"></div>
			</div>
		</div>
	`;

	const audio = new Audio(track.audioUrl);
	const playBtn = container.querySelector('#play-btn');
	const progressBar = container.querySelector('#progress-bar');
	const progressFill = container.querySelector('#progress-fill');
	const currentTimeEl = container.querySelector('#current-time');
	const durationEl = container.querySelector('#duration');
	const volumeSlider = container.querySelector('#volume-slider');

	audio.volume = 1;

	const formatTime = (seconds) => {
		if (!seconds) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	playBtn.addEventListener('click', () => {
		if (audio.paused) {
			audio.play();
			playBtn.textContent = '⏸';
		} else {
			audio.pause();
			playBtn.textContent = '▶';
		}
	});

	audio.addEventListener('timeupdate', () => {
		const percent = (audio.currentTime / audio.duration) * 100;
		progressFill.style.width = percent + '%';
		currentTimeEl.textContent = formatTime(audio.currentTime);
	});

	audio.addEventListener('loadedmetadata', () => {
		durationEl.textContent = formatTime(audio.duration);
	});

	progressBar.addEventListener('click', (e) => {
		const rect = progressBar.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		audio.currentTime = percent * audio.duration;
	});

	volumeSlider.addEventListener('input', (e) => {
		audio.volume = e.target.value / 100;
	});

	audio.addEventListener('ended', () => {
		playBtn.textContent = '▶';
	});

	const ratingContainer = container.querySelector('#rating-widget-container');
	ratingContainer.appendChild(await RatingWidget(trackId));

	const observer = new PeriodicReload(trackId, container);

	return {
		element: container,
		cleanup: () => {
			audio.pause();
			observer.stop();
		}
	};
}

class PeriodicReload {
	constructor(trackId, container) {
		this.trackId = trackId;
		this.container = container;
		this.interval = setInterval(() => this.checkForUpdates(), 5000);
	}

	async checkForUpdates() {
		const { getTrackById } = await import('../store.js');
		const track = await getTrackById(this.trackId);
		if (track) {
			const statsEl = this.container.querySelector('#stats');
			const countEl = this.container.querySelector('#ratings-count');
			const scoreEl = this.container.querySelector('.track-total-score-num');

			if (statsEl) statsEl.textContent = `⭐ ${track.totalRatings} оценок`;
			if (countEl) countEl.textContent = `${track.totalRatings} оценок`;
			if (scoreEl) scoreEl.textContent = track.averageRating.toFixed(1);
		}
	}

	stop() {
		clearInterval(this.interval);
	}
}
