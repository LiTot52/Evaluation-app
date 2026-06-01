import { db, auth } from '../firebase-config.js';
import {
	doc, getDoc, collection, query,
	where, orderBy, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function renderProfileView(container, userId) {
	// Если userId не передан — показываем профиль текущего юзера
	const uid = userId || auth.currentUser?.uid;

	if (!uid) {
		container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__text">Войдите, чтобы видеть профиль</p>
      </div>`;
		return;
	}

	// Скелетон-заглушка пока грузим данные
	container.innerHTML = `
    <div class="profile-page">
      <div class="profile-header skeleton-box" style="height:260px"></div>
      <div class="profile-stats skeleton-box" style="height:100px;margin-top:16px"></div>
      <div class="profile-tracks__grid" style="margin-top:24px">
        ${Array(4).fill('<div class="track-card skeleton-box" style="height:200px"></div>').join('')}
      </div>
    </div>`;

	try {
		// Параллельно тянем профиль + треки
		const [userSnap, tracksSnap] = await Promise.all([
			getDoc(doc(db, 'users', uid)),
			getDocs(
				query(
					collection(db, 'tracks'),
					where('uploadedBy', '==', uid),
					orderBy('createdAt', 'desc')
				)
			)
		]);

		const userData = userSnap.exists() ? userSnap.data() : null;
		const tracks = [];
		tracksSnap.forEach(d => tracks.push({ id: d.id, ...d.data() }));

		// Считаем суммарную статистику из треков
		const totalRatings = tracks.reduce((sum, t) => sum + (t.totalRatings || 0), 0);
		const avgRating = tracks.length
			? (tracks.reduce((sum, t) => sum + (t.averageRating || 0), 0) / tracks.length).toFixed(1)
			: '—';

		const displayName = userData?.username || userData?.displayName || 'Неизвестный исполнитель';
		const email = userData?.email || '';
		const avatarUrl = userData?.avatar || userData?.photoURL || null;
		const createdAt = userData?.createdAt?.toDate
			? userData.createdAt.toDate().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
			: '';

		const isOwn = auth.currentUser?.uid === uid;

		// Карточки треков
		const tracksHTML = tracks.length
			? tracks.map(t => {
				const cover = t.coverUrl
					? `<img src="${t.coverUrl}" alt="${escHtml(t.title)}" class="track-card__cover">`
					: `<div class="track-card__cover track-card__cover--placeholder"><span>♪</span></div>`;
				const rating = t.totalRatings
					? `<span class="badge badge--accent">${(t.averageRating || 0).toFixed(1)} ★</span>`
					: `<span class="badge">Без оценок</span>`;
				return `
            <a href="#track/${t.id}" class="track-card track-card--profile">
              ${cover}
              <div class="track-card__body">
                <p class="track-card__title">${escHtml(t.title)}</p>
                <p class="track-card__meta">${escHtml(t.genre || '')}</p>
                <div class="track-card__footer">
                  ${rating}
                  <span class="track-card__ratings">${t.totalRatings || 0} оц.</span>
                </div>
              </div>
            </a>`;
			}).join('')
			: `<p class="empty-state__text" style="grid-column:1/-1">Треков пока нет</p>`;

		// Разбивка по критериям — среднее по всем трекам
		const criteria = ['rhymes', 'structure', 'style', 'charisma', 'vibe'];
		const criteriaLabels = {
			rhymes: 'Рифмы / образы',
			structure: 'Структура / ритмика',
			style: 'Реализация стиля',
			charisma: 'Индивидуальность',
			vibe: 'Вайб'
		};
		let criteriaHTML = '';
		if (tracks.length && totalRatings > 0) {
			criteriaHTML = `
        <div class="profile-criteria">
          <h3 class="section-title">Разбивка по критериям</h3>
          <div class="criteria-bars">
            ${criteria.map(key => {
				const avg = tracks
					.filter(t => t.ratingBreakdown?.[key] != null)
					.reduce((sum, t) => sum + (t.ratingBreakdown[key] || 0), 0) /
					Math.max(tracks.filter(t => t.ratingBreakdown?.[key] != null).length, 1);
				const pct = (avg / 10 * 100).toFixed(1);
				return `
                <div class="criteria-bar">
                  <div class="criteria-bar__label">
                    <span>${criteriaLabels[key]}</span>
                    <span class="criteria-bar__value">${avg.toFixed(1)}</span>
                  </div>
                  <div class="criteria-bar__track">
                    <div class="criteria-bar__fill" style="width:${pct}%"></div>
                  </div>
                </div>`;
			}).join('')}
          </div>
        </div>`;
		}

		container.innerHTML = `
      <div class="profile-page">

        <!-- Шапка профиля -->
        <div class="profile-header">
          <div class="profile-header__bg"></div>
          <div class="profile-header__content">
            <div class="profile-avatar">
              ${avatarUrl
				? `<img src="${avatarUrl}" alt="Аватар" class="profile-avatar__img">`
				: `<div class="profile-avatar__placeholder">${displayName.charAt(0).toUpperCase()}</div>`}
              ${isOwn ? `<button class="profile-avatar__edit-btn" id="btn-change-avatar" title="Сменить аватар">✎</button>` : ''}
            </div>
            <div class="profile-header__info">
              <h1 class="profile-name">${escHtml(displayName)}</h1>
              ${email ? `<p class="profile-email">${escHtml(email)}</p>` : ''}
              ${createdAt ? `<p class="profile-since">На сайте с ${createdAt}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Статистика -->
        <div class="profile-stats">
          <div class="stat-card">
            <span class="stat-card__value">${tracks.length}</span>
            <span class="stat-card__label">Треков</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__value">${totalRatings}</span>
            <span class="stat-card__label">Оценок получено</span>
          </div>
          <div class="stat-card stat-card--accent">
            <span class="stat-card__value">${avgRating}</span>
            <span class="stat-card__label">Средний рейтинг</span>
          </div>
        </div>

        ${criteriaHTML}

        <!-- Треки музыканта -->
        <section class="profile-tracks">
          <h2 class="section-title">Треки исполнителя</h2>
          <div class="profile-tracks__grid">
            ${tracksHTML}
          </div>
        </section>

      </div>`;

	} catch (err) {
		console.error('ProfileView error:', err);
		container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__text">Ошибка загрузки профиля: ${err.message}</p>
      </div>`;
	}
}

function escHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}