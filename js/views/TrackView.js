// ══════════════════════════════════════════
//   TRACKVIEW.JS
// ══════════════════════════════════════════

import { getTrackById, CRITERIA, currentUser, updateTrackInfo, deleteTrack, GENRES } from '../store.js';
import { RatingWidget } from '../components/RatingWidget.js';
import { CommentsSection } from '../components/Comments.js';
import { formatTime, showToast } from '../utils.js';
import { goToView } from '../router.js';
import { playTrack, stop as stopGlobal } from '../player.js';
import { Icons } from '../icons.js';

// Цвета жанров
const GENRE_COLORS = {
  'Trap': '#a78bfa', 'Drill': '#f87171', 'Phonk': '#fb923c', 'R&B': '#f472b6',
  'Soul': '#fb7185', 'Neo-Soul': '#e879f9', 'Boom Bap': '#60a5fa', 'Jazz Rap': '#34d399',
  'Lo-Fi Рэп': '#94a3b8', 'Cloud Rap': '#7dd3fc', 'Рэп': '#e8ff47',
  'Хип-Хоп': '#facc15', 'Hardcore Рэп': '#ef4444', 'Conscious Rap': '#4ade80',
  'Gangsta Rap': '#f97316', 'Alternative Rap': '#c084fc', 'Pop Rap': '#fb64b6',
  'Crunk': '#ff6b35', 'Mumble Rap': '#a3e635',
};
function genreColor(genre) { return GENRE_COLORS[genre] || '#8a857f'; }

export async function TrackView(trackId) {
  const container = document.createElement('div');
  container.className = 'page track-page-wrap';

  const [track, liked] = await Promise.all([
    getTrackById(trackId),
    isLiked(trackId),
  ]);

  if (!track) {
    container.innerHTML = `
      <div class="empty-state" style="padding-top:160px">
        <div class="empty-state-icon">❌</div>
        <h2 class="empty-state-title">Трек не найден</h2>
        <a href="#feed" class="btn btn--ghost" style="margin-top:8px">На главную</a>
      </div>`;
    return { element: container };
  }

  const isOwn = currentUser?.uid === track.uploadedBy;
  const featStr = track.featArtists?.length ? ` feat. ${track.featArtists.join(', ')}` : '';
  const gColor = genreColor(track.genre);

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

  const genreOptions = GENRES.map(g =>
    `<option value="${g}"${g === track.genre ? ' selected' : ''}>${g}</option>`
  ).join('');

  container.innerHTML = `
    <!-- РАЗМЫТЫЙ ФОН -->
    ${track.coverUrl ? `<div class="track-bg-blur" style="background-image:url('${track.coverUrl}')"></div>` : ''}

    <div class="track-page">
      <!-- ЛЕВАЯ КОЛОНКА -->
      <div class="track-sidebar">

        <!-- Обложка -->
        <div class="track-cover-placeholder" id="track-cover-wrap"
          style="${track.coverUrl ? `background:url('${track.coverUrl}') center/cover;` : ''}">
          ${track.coverUrl ? '' : '🎵'}
          ${isOwn ? `<label class="cover-change-btn" id="cover-label" title="Сменить обложку">✏️<input type="file" id="cover-change-input" accept="image/*" style="display:none"></label>` : ''}
        </div>

        <!-- Плеер с waveform -->
        <div class="audio-player">
          <div class="player-controls">
            <button class="player-play-btn" id="play-btn">▶</button>
            <div class="player-time">
              <span id="cur-time">0:00</span> / <span id="dur-time">0:00</span>
            </div>
          </div>
          <!-- Waveform -->
          <div class="waveform" id="waveform">
            <canvas id="waveform-canvas"></canvas>
            <div class="waveform-progress" id="waveform-progress"></div>
          </div>
          <div class="player-volume">
            <span>🔊</span>
            <input type="range" min="0" max="100" value="100" id="vol-slider">
          </div>
        </div>

        <!-- Разбивка -->
        <div class="track-breakdown">
          <div class="section-label" style="margin-bottom:12px">Разбивка оценок</div>
          ${breakdownRows}
        </div>

        ${isOwn ? `<button class="btn btn--danger btn--full" id="btn-delete-track">Удалить трек</button>` : ''}
      </div>

      <!-- ПРАВАЯ КОЛОНКА -->
      <div class="track-main">
        <div class="track-info">

          <!-- Жанр-бейдж -->
          ${track.genre ? `<div class="genre-badge" style="background:${gColor}20;color:${gColor};border-color:${gColor}40">${track.genre}</div>` : ''}

          <div class="track-title-row">
            <h1 class="track-info-title" id="track-title-display">
              ${track.title}${featStr ? `<span class="feat-str">${featStr}</span>` : ''}
            </h1>
            ${isOwn ? `<button class="btn-icon" id="btn-edit-track">✏️</button>` : ''}
          </div>

          ${isOwn ? `
          <div id="track-edit-form" style="display:none" class="track-edit-panel">
            <div class="field">
              <label class="field-label">Название</label>
              <input class="field-input" id="edit-title" type="text" value="${track.title}">
            </div>
            <div class="field">
              <label class="field-label">Фит (через запятую)</label>
              <input class="field-input" id="edit-feat" type="text"
                value="${(track.featArtists || []).join(', ')}" placeholder="Vasya, Petya">
            </div>
            <div class="field">
              <label class="field-label">Жанр</label>
              <div class="select-wrapper">
                <select class="field-select" id="edit-genre">${genreOptions}</select>
                <span class="select-arrow">▾</span>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Заменить аудио (необязательно)</label>
              <div class="file-drop file-drop--sm" id="audio-edit-drop">
                <div class="file-drop-icon">🎵</div>
                <div class="file-drop-text">Перетащите или <strong>нажмите</strong></div>
                <input type="file" id="audio-edit-input" accept="audio/*">
              </div>
              <p class="field-hint" id="audio-edit-hint"></p>
            </div>
            <div class="field">
              <label class="field-label">Текст песни</label>
              <textarea class="field-textarea field-textarea--lyrics" id="edit-lyrics"
                rows="8" placeholder="Вставьте текст песни...">${track.lyrics || ''}</textarea>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--primary btn--sm" id="btn-save-track">Сохранить</button>
              <button class="btn btn--ghost btn--sm" id="btn-cancel-track">Отмена</button>
            </div>
          </div>` : ''}

          <div class="track-info-author">
            <a href="#profile/${track.uploadedBy}" class="track-author-link">
              ${track.uploadedByName || track.artist || 'Неизвестно'}
            </a>
            ${isOwn ? '<span class="own-badge">Мой трек</span>' : ''}
          </div>

          ${track.description ? `<p class="track-description">${track.description}</p>` : ''}

          <!-- Текст песни -->
          ${track.lyrics ? `
          <div class="lyrics-block" id="lyrics-block">
            <button class="lyrics-toggle" id="lyrics-toggle">
              <span class="lyrics-toggle-icon">${Icons.music}</span>
              Текст песни
              <span class="lyrics-toggle-arrow" id="lyrics-arrow">▾</span>
            </button>
            <div class="lyrics-content" id="lyrics-content">
              <pre class="lyrics-text">${_escapeLyrics(track.lyrics)}</pre>
            </div>
          </div>` : (isOwn ? `
          <div class="lyrics-block">
            <button class="lyrics-toggle lyrics-toggle--empty" id="lyrics-toggle">
              <span class="lyrics-toggle-icon">${Icons.music}</span>
              Добавить текст песни
              <span class="lyrics-toggle-arrow">▾</span>
            </button>
          </div>` : '')}

          <!-- Лайк + теги -->
          <div class="track-actions-row">
            <button class="like-btn ${liked ? 'like-btn--active' : ''}" id="like-btn">
              <span class="like-icon">${liked ? '❤️' : '🤍'}</span>
              <span class="like-count" id="like-count">${track.likesCount || 0}</span>
            </button>
            <span class="tag" id="rating-tag">⭐ ${track.totalRatings || 0} оценок</span>
          </div>
        </div>

        <!-- Итоговый балл -->
        <div class="track-total-score">
          <div class="track-total-score-num" id="avg-score">
            ${track.averageRating ? track.averageRating.toFixed(1) : '—'}
          </div>
          <div>
            <div class="track-total-score-title">Средняя оценка</div>
            <div class="track-total-score-count" id="total-count">${track.totalRatings || 0} оценок</div>
          </div>
        </div>

        <!-- Виджет оценки -->
        <div id="rating-widget-container"></div>

        <!-- Комментарии -->
        <div id="comments-container" style="margin-top:32px"></div>
      </div>
    </div>`;

  // ── Waveform ──
  const audio = new Audio(track.audioUrl);
  const canvas = container.querySelector('#waveform-canvas');
  const wfWrap = container.querySelector('#waveform');
  const wfProg = container.querySelector('#waveform-progress');
  const playBtn = container.querySelector('#play-btn');
  const curTime = container.querySelector('#cur-time');
  const durTime = container.querySelector('#dur-time');
  const volSlid = container.querySelector('#vol-slider');

  _initWaveform(canvas, wfWrap, audio);

  playBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play(); playBtn.textContent = '⏸'; }
    else { audio.pause(); playBtn.textContent = '▶'; }
  });
  audio.addEventListener('loadedmetadata', () => {
    durTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    curTime.textContent = formatTime(audio.currentTime);
    const pct = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
    wfProg.style.width = pct + '%';
  });
  audio.addEventListener('ended', () => { playBtn.textContent = '▶'; });
  wfWrap.addEventListener('click', e => {
    if (!audio.duration) return;
    const r = wfWrap.getBoundingClientRect();
    audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
  });
  volSlid.addEventListener('input', e => { audio.volume = e.target.value / 100; });

  // ── Лайк ──
  const likeBtn = container.querySelector('#like-btn');
  const likeCount = container.querySelector('#like-count');
  let likedState = liked;

  likeBtn.addEventListener('click', async () => {
    if (!currentUser) {
      document.getElementById('auth-modal').classList.add('open');
      return;
    }
    try {
      likeBtn.disabled = true;
      likedState = await likeTrack(trackId);
      likeBtn.querySelector('.like-icon').textContent = likedState ? '❤️' : '🤍';
      likeBtn.classList.toggle('like-btn--active', likedState);
      const cur = parseInt(likeCount.textContent) || 0;
      likeCount.textContent = likedState ? cur + 1 : Math.max(0, cur - 1);
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      likeBtn.disabled = false;
    }
  });

  // ── Текст песни — toggle ──
  const lyricsToggle = container.querySelector('#lyrics-toggle');
  const lyricsContent = container.querySelector('#lyrics-content');
  const lyricsArrow = container.querySelector('#lyrics-arrow');

  if (lyricsToggle && lyricsContent) {
    lyricsContent.style.display = 'none'; // закрыт по умолчанию
    lyricsToggle.addEventListener('click', () => {
      const isOpen = lyricsContent.style.display !== 'none';
      lyricsContent.style.display = isOpen ? 'none' : 'block';
      if (lyricsArrow) lyricsArrow.textContent = isOpen ? '▾' : '▴';
    });
  } else if (lyricsToggle && isOwn) {
    // Кнопка «Добавить текст» — открывает форму редактирования
    lyricsToggle.addEventListener('click', () => {
      const form = container.querySelector('#track-edit-form');
      if (form) {
        form.style.display = 'block';
        container.querySelector('#edit-lyrics')?.focus();
        container.querySelector('#edit-lyrics')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // ── Виджет оценки ──
  const rw = container.querySelector('#rating-widget-container');
  rw.appendChild(await RatingWidget(trackId, (newAvg, newCount) => {
    container.querySelector('#avg-score').textContent = newAvg.toFixed(1);
    container.querySelector('#total-count').textContent = `${newCount} оценок`;
    container.querySelector('#rating-tag').textContent = `⭐ ${newCount} оценок`;
  }));

  // ── Комментарии ──
  const cc = container.querySelector('#comments-container');
  cc.appendChild(await CommentsSection(trackId));

  if (!isOwn) return { element: container, cleanup: () => audio.pause() };

  // ── Редактирование ──
  container.querySelector('#btn-edit-track').addEventListener('click', () => {
    const form = container.querySelector('#track-edit-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  container.querySelector('#btn-cancel-track').addEventListener('click', () => {
    container.querySelector('#track-edit-form').style.display = 'none';
  });

  let localAudioFile = null;
  const audioDrop = container.querySelector('#audio-edit-drop');
  const audioInput = container.querySelector('#audio-edit-input');
  const audioHint = container.querySelector('#audio-edit-hint');

  audioDrop.addEventListener('click', () => audioInput.click());
  const onAudioFile = f => {
    if (!f.type.startsWith('audio/')) { showToast('Нужен аудиофайл', 'error'); return; }
    localAudioFile = f;
    audioHint.textContent = `✓ ${f.name}`;
    audioHint.style.color = 'var(--accent)';
    audioDrop.querySelector('.file-drop-icon').textContent = '✅';
  };
  audioInput.addEventListener('change', e => e.target.files[0] && onAudioFile(e.target.files[0]));
  audioDrop.addEventListener('dragover', e => { e.preventDefault(); audioDrop.classList.add('drag-over'); });
  audioDrop.addEventListener('dragleave', () => audioDrop.classList.remove('drag-over'));
  audioDrop.addEventListener('drop', e => {
    e.preventDefault(); audioDrop.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) onAudioFile(e.dataTransfer.files[0]);
  });

  container.querySelector('#btn-save-track').addEventListener('click', async () => {
    const saveBtn = container.querySelector('#btn-save-track');
    const newTitle = container.querySelector('#edit-title').value.trim();
    const featRaw = container.querySelector('#edit-feat').value.trim();
    const newGenre = container.querySelector('#edit-genre').value;
    const featList = featRaw ? featRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!newTitle) { showToast('Название не может быть пустым', 'error'); return; }
    try {
      saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...';
      const updates = await updateTrackInfo(trackId, {
        title: newTitle, featArtists: featList, genre: newGenre,
        lyrics: container.querySelector('#edit-lyrics')?.value ?? undefined,
        audioFile: localAudioFile || undefined,
      });
      const newLyrics = container.querySelector('#edit-lyrics')?.value.trim() || '';
      const newFeat = featList.length ? ` feat. ${featList.join(', ')}` : '';
      container.querySelector('#track-title-display').innerHTML =
        newTitle + (newFeat ? `<span class="feat-str">${newFeat}</span>` : '');
      const gb = container.querySelector('.genre-badge');
      if (gb) { const c = genreColor(newGenre); gb.textContent = newGenre; gb.style.background = c + '20'; gb.style.color = c; gb.style.borderColor = c + '40'; }
      if (updates.audioUrl) { audio.src = updates.audioUrl; audio.load(); localAudioFile = null; audioHint.textContent = ''; audioDrop.querySelector('.file-drop-icon').textContent = '🎵'; }

      // Обновляем блок текста
      const lyricsBlock = container.querySelector('#lyrics-block');
      if (lyricsBlock) {
        if (newLyrics) {
          const lyricsText = lyricsBlock.querySelector('.lyrics-text');
          if (lyricsText) {
            lyricsText.innerHTML = _escapeLyrics(newLyrics);
          } else {
            lyricsBlock.innerHTML = `
							<button class="lyrics-toggle" id="lyrics-toggle">
								<span class="lyrics-toggle-icon">${Icons.music}</span>
								Текст песни
								<span class="lyrics-toggle-arrow" id="lyrics-arrow">▾</span>
							</button>
							<div class="lyrics-content" id="lyrics-content" style="display:none">
								<pre class="lyrics-text">${_escapeLyrics(newLyrics)}</pre>
							</div>`;
            lyricsBlock.querySelector('#lyrics-toggle').addEventListener('click', () => {
              const c = lyricsBlock.querySelector('#lyrics-content');
              const a = lyricsBlock.querySelector('#lyrics-arrow');
              const open = c.style.display !== 'none';
              c.style.display = open ? 'none' : 'block';
              if (a) a.textContent = open ? '▾' : '▴';
            });
          }
        }
      }

      container.querySelector('#track-edit-form').style.display = 'none';
      showToast('Трек обновлён ✓', 'success');
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
  });

  container.querySelector('#cover-change-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const label = container.querySelector('#cover-label');
    label.childNodes[0].textContent = '⏳';
    try {
      const updates = await updateTrackInfo(trackId, { coverFile: file });
      const wrap = container.querySelector('#track-cover-wrap');
      wrap.style.background = `url('${updates.coverUrl}') center/cover`;
      const bg = container.querySelector('.track-bg-blur');
      if (bg) bg.style.backgroundImage = `url('${updates.coverUrl}')`;
      label.childNodes[0].textContent = '✏️';
      showToast('Обложка обновлена ✓', 'success');
    } catch (err) { showToast('Ошибка: ' + err.message, 'error'); label.childNodes[0].textContent = '✏️'; }
  });

  container.querySelector('#btn-delete-track')?.addEventListener('click', async () => {
    if (!confirm(`Удалить трек «${track.title}»?`)) return;
    try { await deleteTrack(trackId); audio.pause(); showToast('Трек удалён', 'success'); goToView('feed'); }
    catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
  });

  return { element: container, cleanup: () => audio.pause() };
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function _escapeLyrics(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────
// WAVEFORM
// ─────────────────────────────────────────
function _initWaveform(canvas, wrap, audio) {
  const BAR_COUNT = 60;
  const bars = Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.85);

  function draw(progress = 0) {
    if (!canvas) return;
    const W = wrap.offsetWidth || 280;
    const H = 48;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const barW = (W / BAR_COUNT) * 0.6;
    const gap = (W / BAR_COUNT) * 0.4;
    const progPx = W * progress;

    bars.forEach((amp, i) => {
      const x = i * (barW + gap);
      const h = Math.max(3, amp * H * 0.9);
      const y = (H - h) / 2;
      const done = x < progPx;

      ctx.fillStyle = done
        ? 'rgba(232,255,71,0.9)'
        : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 2);
      ctx.fill();
    });
  }

  draw(0);

  // Попытка Web Audio API для реального waveform
  audio.addEventListener('canplay', async () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch(audio.src);
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      const data = decoded.getChannelData(0);
      const step = Math.floor(data.length / BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j]);
        bars[i] = Math.min(1, (sum / step) * 6 + 0.08);
      }
      draw(0);
      ctx.close();
    } catch (e) {
      // Используем случайные бары (уже нарисованы)
    }
  }, { once: true });

  audio.addEventListener('timeupdate', () => {
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    draw(p);
  });

  window.addEventListener('resize', () => draw(
    audio.duration ? audio.currentTime / audio.duration : 0
  ));
}