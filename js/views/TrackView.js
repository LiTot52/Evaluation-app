// ══════════════════════════════════════════
//   TRACKVIEW.JS
// ══════════════════════════════════════════

import { getTrackById, CRITERIA, currentUser, updateTrackInfo, deleteTrack, GENRES } from '../store.js';
import { RatingWidget } from '../components/RatingWidget.js';
import { formatTime, showToast } from '../utils.js';
import { goToView } from '../router.js';

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

  const isOwn = currentUser?.uid === track.uploadedBy;

  // Фиты — строка вида "feat. Вася, Петя"
  const featStr = track.featArtists?.length
    ? ` feat. ${track.featArtists.join(', ')}`
    : '';

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

        <!-- Обложка + кнопка смены (только автор) -->
        <div class="track-cover-placeholder" id="track-cover-wrap"
          style="${track.coverUrl ? `background:url('${track.coverUrl}') center/cover;` : ''}">
          ${track.coverUrl ? '' : '🎵'}
          ${isOwn ? `
            <label class="cover-change-btn" id="cover-label" title="Сменить обложку">
              ✏️
              <input type="file" id="cover-change-input" accept="image/*" style="display:none">
            </label>` : ''}
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

        <!-- Разбивка оценок -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px">
          <div class="section-label" style="margin-bottom:14px">Разбивка оценок</div>
          ${breakdownRows}
        </div>

        <!-- Удалить трек (только автор) -->
        ${isOwn ? `
          <button class="btn btn--danger btn--full" id="btn-delete-track">🗑 Удалить трек</button>
        ` : ''}
      </div>

      <!-- ПРАВАЯ КОЛОНКА -->
      <div class="track-main">
        <div class="track-info">

          <!-- Название + редактирование -->
          <div class="track-title-row">
            <h1 class="track-info-title" id="track-title-display">${track.title}${featStr ? `<span class="feat-str">${featStr}</span>` : ''}</h1>
            ${isOwn ? `<button class="btn-icon" id="btn-edit-track" title="Редактировать">✏️</button>` : ''}
          </div>

          <!-- Форма редактирования (скрыта) -->
          ${isOwn ? `
            <div id="track-edit-form" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;margin-top:12px">
              <div class="field" style="margin-bottom:12px">
                <label class="field-label">Название</label>
                <input class="field-input" id="edit-title-input" type="text" value="${track.title}">
              </div>
              <div class="field" style="margin-bottom:12px">
                <label class="field-label">Фит (через запятую)</label>
                <input class="field-input" id="edit-feat-input" type="text"
                  value="${(track.featArtists || []).join(', ')}"
                  placeholder="Vasya, Petya">
              </div>
              <div style="display:flex;gap:8px;margin-top:4px">
                <button class="btn btn--primary btn--sm" id="btn-save-track">Сохранить</button>
                <button class="btn btn--ghost btn--sm" id="btn-cancel-track">Отмена</button>
              </div>
            </div>` : ''}

          <div class="track-info-author" style="margin:10px 0 16px;display:flex;align-items:center;gap:8px">
            <span style="color:var(--text-2)">👤</span>
            <a href="#profile/${track.uploadedBy}" style="color:var(--text-2);transition:color .15s"
               onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-2)'">
              ${track.uploadedByName || track.artist || 'Неизвестно'}
            </a>
            ${isOwn ? '<span class="own-badge">Мой трек</span>' : ''}
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

  if (!isOwn) return { element: container, cleanup: () => audio.pause() };

  // ── Редактирование названия / фитов ──
  const btnEdit = container.querySelector('#btn-edit-track');
  const editForm = container.querySelector('#track-edit-form');
  const titleDisp = container.querySelector('#track-title-display');

  btnEdit.addEventListener('click', () => {
    editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
  });

  container.querySelector('#btn-cancel-track').addEventListener('click', () => {
    editForm.style.display = 'none';
  });

  container.querySelector('#btn-save-track').addEventListener('click', async () => {
    const saveBtn = container.querySelector('#btn-save-track');
    const newTitle = container.querySelector('#edit-title-input').value.trim();
    const featRaw = container.querySelector('#edit-feat-input').value.trim();
    const featList = featRaw ? featRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!newTitle) { showToast('Название не может быть пустым', 'error'); return; }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Сохранение...';
      await updateTrackInfo(trackId, { title: newTitle, featArtists: featList });

      const newFeatStr = featList.length ? ` feat. ${featList.join(', ')}` : '';
      titleDisp.innerHTML = newTitle + (newFeatStr ? `<span class="feat-str">${newFeatStr}</span>` : '');
      editForm.style.display = 'none';
      showToast('Трек обновлён ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Сохранить';
    }
  });

  // ── Смена обложки ──
  const coverInput = container.querySelector('#cover-change-input');
  coverInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const label = container.querySelector('#cover-label');
    label.textContent = '⏳';
    try {
      const updates = await updateTrackInfo(trackId, { coverFile: file });
      const wrap = container.querySelector('#track-cover-wrap');
      wrap.style.background = `url('${updates.coverUrl}') center/cover`;
      wrap.textContent = '';
      wrap.appendChild(label);
      label.innerHTML = '✏️<input type="file" id="cover-change-input" accept="image/*" style="display:none">';
      showToast('Обложка обновлена ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
      label.innerHTML = '✏️<input type="file" id="cover-change-input" accept="image/*" style="display:none">';
    }
  });

  // ── Удаление трека ──
  container.querySelector('#btn-delete-track')?.addEventListener('click', async () => {
    if (!confirm(`Удалить трек «${track.title}»? Это нельзя отменить.`)) return;
    try {
      await deleteTrack(trackId);
      showToast('Трек удалён', 'success');
      audio.pause();
      goToView('feed');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    }
  });

  return { element: container, cleanup: () => audio.pause() };
}