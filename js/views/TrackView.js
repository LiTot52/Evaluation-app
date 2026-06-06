// ══════════════════════════════════════════
//   TRACKVIEW.JS
// ══════════════════════════════════════════

import { getTrackById, CRITERIA, currentUser, updateTrackInfo, deleteTrack, GENRES } from '../store.js';
import { RatingWidget } from '../components/RatingWidget.js';
import { formatTime, showToast } from '../utils.js';
import { goToView } from '../router.js';
import { playTrack, stop as stopGlobal, registerLocalCleanup } from '../player.js';

export async function TrackView(trackId) {
  const container = document.createElement('div');
  container.className = 'page';

  const track = await getTrackById(trackId);

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
    <div class="track-page">

      <!-- ЛЕВАЯ КОЛОНКА -->
      <div class="track-sidebar">
        <div class="track-cover-placeholder" id="track-cover-wrap"
          style="${track.coverUrl ? `background:url('${track.coverUrl}') center/cover;` : ''}">
          ${track.coverUrl ? '' : '🎵'}
          ${isOwn ? `<label class="cover-change-btn" id="cover-label" title="Сменить обложку">✏️<input type="file" id="cover-change-input" accept="image/*" style="display:none"></label>` : ''}
        </div>

        <!-- Плеер -->
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
          <div class="track-title-row">
            <h1 class="track-info-title" id="track-title-display">
              ${track.title}${featStr ? `<span class="feat-str">${featStr}</span>` : ''}
            </h1>
            ${isOwn ? `<button class="btn-icon" id="btn-edit-track">✏️</button>` : ''}
          </div>

          <!-- Форма редактирования -->
          ${isOwn ? `
            <div id="track-edit-form" style="display:none" class="track-edit-panel">
              <div class="field">
                <label class="field-label">Название</label>
                <input class="field-input" id="edit-title" type="text" value="${track.title}">
              </div>
              <div class="field">
                <label class="field-label">Фит (через запятую)</label>
                <input class="field-input" id="edit-feat" type="text"
                  value="${(track.featArtists || []).join(', ')}"
                  placeholder="Vasya, Petya">
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
              <div style="display:flex;gap:8px;margin-top:4px">
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

          <div class="track-info-tags">
            ${track.genre ? `<span class="tag" id="genre-tag">🎸 ${track.genre}</span>` : ''}
            <span class="tag" id="rating-tag">⭐ ${track.totalRatings || 0} оценок</span>
          </div>
        </div>

        <div class="track-total-score">
          <div class="track-total-score-num" id="avg-score">
            ${track.averageRating ? track.averageRating.toFixed(1) : '—'}
          </div>
          <div>
            <div class="track-total-score-title">Средняя оценка</div>
            <div class="track-total-score-count" id="total-count">${track.totalRatings || 0} оценок</div>
          </div>
        </div>

        <div id="rating-widget-container"></div>
      </div>
    </div>`;

  // ── Локальный плеер ──
  let localAudioFile = null;
  const audio = new Audio(track.audioUrl);
  const playBtn = container.querySelector('#play-btn');
  const progBar = container.querySelector('#progress-bar');
  const progFill = container.querySelector('#progress-fill');
  const curTime = container.querySelector('#cur-time');
  const durTime = container.querySelector('#dur-time');
  const volSlid = container.querySelector('#vol-slider');

  playBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play(); playBtn.textContent = '⏸'; }
    else { audio.pause(); playBtn.textContent = '▶'; }
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

  if (!isOwn) return {
    element: container,
    cleanup: () => audio.pause(),
  };

  // ── Редактирование ──
  container.querySelector('#btn-edit-track').addEventListener('click', () => {
    const form = container.querySelector('#track-edit-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  container.querySelector('#btn-cancel-track').addEventListener('click', () => {
    container.querySelector('#track-edit-form').style.display = 'none';
  });

  // Drag-drop для аудио в форме редактирования
  const audioDrop = container.querySelector('#audio-edit-drop');
  const audioInput = container.querySelector('#audio-edit-input');
  const audioHint = container.querySelector('#audio-edit-hint');

  audioDrop.addEventListener('click', () => audioInput.click());
  audioInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) { showToast('Нужен аудиофайл', 'error'); return; }
    localAudioFile = f;
    audioHint.textContent = `✓ ${f.name}`;
    audioHint.style.color = 'var(--accent)';
    audioDrop.querySelector('.file-drop-icon').textContent = '✅';
  });
  audioDrop.addEventListener('dragover', e => { e.preventDefault(); audioDrop.classList.add('drag-over'); });
  audioDrop.addEventListener('dragleave', () => audioDrop.classList.remove('drag-over'));
  audioDrop.addEventListener('drop', e => {
    e.preventDefault();
    audioDrop.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith('audio/')) { showToast('Нужен аудиофайл', 'error'); return; }
    localAudioFile = f;
    audioHint.textContent = `✓ ${f.name}`;
    audioHint.style.color = 'var(--accent)';
    audioDrop.querySelector('.file-drop-icon').textContent = '✅';
  });

  container.querySelector('#btn-save-track').addEventListener('click', async () => {
    const saveBtn = container.querySelector('#btn-save-track');
    const newTitle = container.querySelector('#edit-title').value.trim();
    const featRaw = container.querySelector('#edit-feat').value.trim();
    const newGenre = container.querySelector('#edit-genre').value;
    const featList = featRaw ? featRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!newTitle) { showToast('Название не может быть пустым', 'error'); return; }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Сохранение...';

      const updates = await updateTrackInfo(trackId, {
        title: newTitle,
        featArtists: featList,
        genre: newGenre,
        audioFile: localAudioFile || undefined,
      });

      // Обновляем UI
      const newFeat = featList.length ? ` feat. ${featList.join(', ')}` : '';
      container.querySelector('#track-title-display').innerHTML =
        newTitle + (newFeat ? `<span class="feat-str">${newFeat}</span>` : '');
      container.querySelector('#genre-tag').textContent = `🎸 ${newGenre}`;

      if (updates.audioUrl) {
        audio.src = updates.audioUrl;
        audio.load();
        localAudioFile = null;
        audioHint.textContent = '';
        audioDrop.querySelector('.file-drop-icon').textContent = '🎵';
      }

      container.querySelector('#track-edit-form').style.display = 'none';
      showToast('Трек обновлён ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Сохранить';
    }
  });

  // ── Смена обложки ──
  container.querySelector('#cover-change-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const label = container.querySelector('#cover-label');
    label.childNodes[0].textContent = '⏳';
    try {
      const updates = await updateTrackInfo(trackId, { coverFile: file });
      const wrap = container.querySelector('#track-cover-wrap');
      wrap.style.background = `url('${updates.coverUrl}') center/cover`;
      wrap.firstChild.textContent = '';
      label.childNodes[0].textContent = '✏️';
      showToast('Обложка обновлена ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
      label.childNodes[0].textContent = '✏️';
    }
  });

  // ── Удаление ──
  container.querySelector('#btn-delete-track')?.addEventListener('click', async () => {
    if (!confirm(`Удалить трек «${track.title}»?`)) return;
    try {
      await deleteTrack(trackId);
      audio.pause();
      showToast('Трек удалён', 'success');
      goToView('feed');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    }
  });

  return {
    element: container,
    cleanup: () => audio.pause(),
  };
}