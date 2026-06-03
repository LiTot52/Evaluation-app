// ══════════════════════════════════════════
//   PROFILEVIEW.JS — Профиль пользователя
// ══════════════════════════════════════════

import { getUserById, getTracksByUser, currentUser, CRITERIA } from '../store.js';
import { TrackCard } from '../components/TrackCard.js';

export async function ProfileView(userId) {
	const container = document.createElement('div');
	container.className = 'page';

	// Загружаем данные параллельно
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

	// ── Считаем статистику ──
	const tracksWithRatings = userTracks.filter(t => t.totalRatings > 0);
	const avgRating = tracksWithRatings.length
		? (tracksWithRatings.reduce((s, t) => s + t.averageRating, 0) / tracksWithRatings.length).toFixed(1)
		: '—';
	const totalReceivedRatings = userTracks.reduce((s, t) => s + (t.totalRatings || 0), 0);

	// Лучший трек
	const bestTrack = tracksWithRatings.length
		? tracksWithRatings.reduce((best, t) => t.averageRating > best.averageRating ? t : best)
		: null;

	// Разбивка по критериям — среднее по всем трекам
	const criteriaAvg = {};
	if (tracksWithRatings.length) {
		CRITERIA.forEach(({ key }) => {
			const vals = tracksWithRatings.map(t => t.ratingBreakdown?.[key] || 0);
			criteriaAvg[key] = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
		});
	}

	const isOwnProfile = currentUser?.uid === userId;
	const name = user.username || user.email?.split('@')[0] || 'Без имени';
	const letter = name[0]?.toUpperCase() || '?';

	const avatarHtml = user.avatar
		? `<img src="${user.avatar}" alt="${name}" class="profile-avatar">`
		: `<div class="profile-avatar profile-avatar--letter">${letter}</div>`;

	// ── Критерии HTML ──
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
          </div>
        `).join('')}
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
      <!-- ШАПКА ПРОФИЛЯ -->
      <div class="profile-header">
        ${avatarHtml}
        <div class="profile-info">
          <h1 class="profile-name">${name}</h1>
          <div class="profile-stats">
            <span><span class="profile-stat-val">${userTracks.length}</span> треков</span>
            <span><span class="profile-stat-val">${totalReceivedRatings}</span> оценок получено</span>
            <span>Средний рейтинг: <span class="profile-stat-val">${avgRating}</span></span>
          </div>
          ${isOwnProfile ? `
            <div style="margin-top:16px">
              <a href="#upload" class="btn btn--primary btn--sm">+ Загрузить трек</a>
            </div>` : ''}
        </div>

        <!-- Мини-статы -->
        <div class="profile-score-block">
          <div class="profile-score-num">${avgRating}</div>
          <div class="profile-score-label">средний балл</div>
        </div>
      </div>

      <div class="profile-body">
        <!-- ЛЕВАЯ КОЛОНКА: статистика -->
        <div class="profile-sidebar">

          <!-- Статс-карточки -->
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

	// Вставить карточки треков
	if (userTracks.length > 0) {
		const grid = container.querySelector('#user-tracks-grid');
		userTracks.forEach(t => grid.appendChild(TrackCard(t)));
	}

	return { element: container };
}