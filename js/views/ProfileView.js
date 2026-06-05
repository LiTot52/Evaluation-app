// ══════════════════════════════════════════
//   PROFILEVIEW.JS
// ══════════════════════════════════════════

import { getUserById, getTracksByUser, currentUser, CRITERIA, updateUsername, updateAvatar, deleteTrack } from '../store.js';
import { TrackCard } from '../components/TrackCard.js';
import { showToast } from '../utils.js';
import { goToView } from '../router.js';

export async function ProfileView(userId) {
  const container = document.createElement('div');
  container.className = 'page';

  const [user, userTracks] = await Promise.all([
    getUserById(userId),
    getTracksByUser(userId),
  ]);

  if (!user) {
    container.innerHTML = `
      <div class="empty-state" style="padding-top:200px">
        <div class="empty-state-icon">👤</div>
        <h2 class="empty-state-title">Профиль не найден</h2>
        <a href="#feed" class="btn btn--ghost" style="margin-top:8px">На главную</a>
      </div>`;
    return { element: container };
  }

  const isOwnProfile = currentUser?.uid === userId;

  // ── Считаем статистику ──
  const tracksWithRatings = userTracks.filter(t => t.totalRatings > 0);
  const avgRating = tracksWithRatings.length
    ? (tracksWithRatings.reduce((s, t) => s + t.averageRating, 0) / tracksWithRatings.length).toFixed(1)
    : '—';
  const totalReceivedRatings = userTracks.reduce((s, t) => s + (t.totalRatings || 0), 0);

  const bestTrack = tracksWithRatings.length
    ? tracksWithRatings.reduce((best, t) => t.averageRating > best.averageRating ? t : best)
    : null;

  const criteriaAvg = {};
  if (tracksWithRatings.length) {
    CRITERIA.forEach(({ key }) => {
      const vals = tracksWithRatings.map(t => t.ratingBreakdown?.[key] || 0);
      criteriaAvg[key] = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
    });
  }

  const name = user.username || user.email?.split('@')[0] || 'Без имени';
  const letter = name[0]?.toUpperCase() || '?';

  const avatarHtml = (src) => src
    ? `<img src="${src}" alt="${name}" class="profile-avatar" id="profile-avatar-img">`
    : `<div class="profile-avatar profile-avatar--letter" id="profile-avatar-img">${letter}</div>`;

  const criteriaHtml = tracksWithRatings.length ? `
    <div class="profile-section">
      <div class="section-label">Средние оценки по критериям</div>
      <div class="criteria-breakdown">
        ${CRITERIA.map(({ key, label }) => `
          <div class="criteria-row">
            <div class="criteria-label">${label}</div>
            <div class="criteria-bar-wrap">
              <div class="criteria-bar-fill" style="width:${(criteriaAvg[key] || 0) * 10}%"></div>
            </div>
            <div class="criteria-val">${criteriaAvg[key] || '—'}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const bestTrackHtml = bestTrack ? `
    <div class="profile-best">
      <div class="section-label" style="margin-bottom:12px">Лучший трек</div>
      <a href="#track/${bestTrack.id}" class="profile-best-card">
        <div class="profile-best-cover" style="${bestTrack.coverUrl ? `background:url('${bestTrack.coverUrl}') center/cover` : ''}">
          ${bestTrack.coverUrl ? '' : '🎵'}
        </div>
        <div class="profile-best-info">
          <div class="profile-best-title">${bestTrack.title}</div>
          <div class="profile-best-score">
            <span class="score-badge-num">${bestTrack.averageRating?.toFixed(1)}</span>
            <span style="font-size:12px;color:var(--text-3)">/10</span>
          </div>
        </div>
      </a>
    </div>` : '';

  container.innerHTML = `
    <div>
      <!-- ШАПКА -->
      <div class="profile-header">

        <!-- Аватар + смена (только своя страница) -->
        <div class="profile-avatar-wrap" style="position:relative;flex-shrink:0">
          ${avatarHtml(user.avatar)}
          ${isOwnProfile ? `
            <label class="avatar-change-btn" title="Сменить фото" id="avatar-label">
              ✏️
              <input type="file" id="avatar-input" accept="image/*" style="display:none">
            </label>` : ''}
        </div>

        <div class="profile-info">
          <!-- Имя + кнопка редактирования -->
          <div class="profile-name-row">
            <h1 class="profile-name" id="profile-name-display">${name}</h1>
            ${isOwnProfile ? `
              <button class="btn-icon" id="btn-edit-name" title="Изменить никнейм">✏️</button>` : ''}
          </div>

          <!-- Форма редактирования имени (скрыта) -->
          ${isOwnProfile ? `
            <div class="name-edit-form" id="name-edit-form" style="display:none;margin-top:8px">
              <input class="field-input" id="name-edit-input" type="text" value="${name}" maxlength="30" style="max-width:280px">
              <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn--primary btn--sm" id="btn-save-name">Сохранить</button>
                <button class="btn btn--ghost btn--sm" id="btn-cancel-name">Отмена</button>
              </div>
            </div>` : ''}

          <div class="profile-stats" style="margin-top:10px">
            <span><span class="profile-stat-val">${userTracks.length}</span> треков</span>
            <span><span class="profile-stat-val">${totalReceivedRatings}</span> оценок получено</span>
            <span>Средний рейтинг: <span class="profile-stat-val">${avgRating}</span></span>
          </div>

          ${isOwnProfile ? `
            <div style="margin-top:16px">
              <a href="#upload" class="btn btn--primary btn--sm">+ Загрузить трек</a>
            </div>` : ''}
        </div>

        <div class="profile-score-block">
          <div class="profile-score-num">${avgRating}</div>
          <div class="profile-score-label">средний балл</div>
        </div>
      </div>

      <div class="profile-body">
        <!-- ЛЕВАЯ КОЛОНКА -->
        <div class="profile-sidebar">
          <div class="profile-section">
            <div class="section-label">Статистика</div>
            <div class="profile-stat-cards">
              <div class="profile-stat-card">
                <div class="profile-stat-card-num">${userTracks.length}</div>
                <div class="profile-stat-card-label">Треков</div>
              </div>
              <div class="profile-stat-card">
                <div class="profile-stat-card-num">${totalReceivedRatings}</div>
                <div class="profile-stat-card-label">Оценок получено</div>
              </div>
              <div class="profile-stat-card profile-stat-card--accent">
                <div class="profile-stat-card-num">${avgRating}</div>
                <div class="profile-stat-card-label">Средний балл</div>
              </div>
              <div class="profile-stat-card">
                <div class="profile-stat-card-num">${tracksWithRatings.length}</div>
                <div class="profile-stat-card-label">Треков с оценками</div>
              </div>
            </div>
          </div>
          ${criteriaHtml}
          ${bestTrackHtml}
        </div>

        <!-- ПРАВАЯ КОЛОНКА: треки -->
        <div class="profile-tracks">
          <div class="section-label" style="margin-bottom:16px">
            ${isOwnProfile ? 'Мои треки' : `Треки ${name}`}
            <span style="color:var(--text-3);font-weight:400;margin-left:8px">${userTracks.length}</span>
          </div>

          ${userTracks.length === 0 ? `
            <div class="empty-state" style="padding:60px 0">
              <div class="empty-state-icon">🎵</div>
              <p class="empty-state-text">
                ${isOwnProfile ? 'Вы ещё не загрузили ни одного трека' : 'Нет треков'}
              </p>
              ${isOwnProfile ? `<a href="#upload" class="btn btn--primary" style="margin-top:12px">Загрузить первый трек</a>` : ''}
            </div>` : `
            <div class="tracks-grid" id="user-tracks-grid"></div>`}
        </div>
      </div>
    </div>`;

  // ── Карточки треков ──
  if (userTracks.length > 0) {
    const grid = container.querySelector('#user-tracks-grid');
    userTracks.forEach(t => {
      const card = TrackCard(t);
      if (isOwnProfile) {
        const delBtn = document.createElement('button');
        delBtn.className = 'track-card-delete-btn';
        delBtn.title = 'Удалить трек';
        delBtn.textContent = '🗑';
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm(`Удалить трек «${t.title}»? Это действие нельзя отменить.`)) return;
          try {
            await deleteTrack(t.id);
            card.remove();
            showToast('Трек удалён', 'success');
          } catch (err) {
            showToast('Ошибка: ' + err.message, 'error');
          }
        });
        card.style.position = 'relative';
        card.appendChild(delBtn);
      }
      grid.appendChild(card);
    });
  }

  if (!isOwnProfile) return { element: container };

  // ── Редактирование имени ──
  const btnEdit = container.querySelector('#btn-edit-name');
  const editForm = container.querySelector('#name-edit-form');
  const nameDisp = container.querySelector('#profile-name-display');
  const nameInput = container.querySelector('#name-edit-input');

  btnEdit.addEventListener('click', () => {
    editForm.style.display = 'block';
    btnEdit.style.display = 'none';
    nameInput.focus();
    nameInput.select();
  });

  container.querySelector('#btn-cancel-name').addEventListener('click', () => {
    editForm.style.display = 'none';
    btnEdit.style.display = 'inline-flex';
    nameInput.value = nameDisp.textContent;
  });

  container.querySelector('#btn-save-name').addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    if (!newName || newName === nameDisp.textContent) {
      editForm.style.display = 'none';
      btnEdit.style.display = 'inline-flex';
      return;
    }
    try {
      container.querySelector('#btn-save-name').disabled = true;
      container.querySelector('#btn-save-name').textContent = 'Сохранение...';
      await updateUsername(newName);
      nameDisp.textContent = newName;
      editForm.style.display = 'none';
      btnEdit.style.display = 'inline-flex';
      showToast('Никнейм обновлён ✓', 'success');

      // Обновляем имя в шапке сайта
      const headerName = document.querySelector('.user-name-sm');
      if (headerName) headerName.textContent = newName;
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      const saveBtn = container.querySelector('#btn-save-name');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
    }
  });

  // ── Смена аватарки ──
  const avatarInput = container.querySelector('#avatar-input');
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Нужно изображение', 'error'); return; }

    const label = container.querySelector('#avatar-label');
    label.textContent = '⏳';

    try {
      const url = await updateAvatar(file);
      // Заменяем аватар в DOM
      const wrap = container.querySelector('.profile-avatar-wrap');
      const oldAvatar = wrap.querySelector('#profile-avatar-img');
      const newImg = document.createElement('img');
      newImg.src = url;
      newImg.alt = name;
      newImg.className = 'profile-avatar';
      newImg.id = 'profile-avatar-img';
      oldAvatar.replaceWith(newImg);

      // Обновляем аватар в шапке
      const headerAvatar = document.querySelector('.user-avatar-sm');
      if (headerAvatar && headerAvatar.tagName === 'IMG') headerAvatar.src = url;

      label.innerHTML = '✏️<input type="file" id="avatar-input" accept="image/*" style="display:none">';
      showToast('Аватар обновлён ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
      label.innerHTML = '✏️<input type="file" id="avatar-input" accept="image/*" style="display:none">';
    }
  });

  return { element: container };
}