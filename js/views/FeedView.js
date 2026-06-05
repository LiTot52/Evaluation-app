// ══════════════════════════════════════════
//   FEEDVIEW.JS — Лента треков
// ══════════════════════════════════════════

import { db } from '../firebase-config.js';
import {
	collection, query, orderBy, limit,
	getDocs, startAfter,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { TrackCard } from '../components/TrackCard.js';

const PAGE_SIZE = 12;

export async function FeedView() {
	const container = document.createElement('div');
	container.className = 'page';

	container.innerHTML = `
    <div class="feed-page">
      <div class="feed-header">
        <h1 class="feed-title">Лента <span>треков</span></h1>
        <div class="feed-filters" id="feed-filters">
          <button class="filter-btn filter-btn--active" data-sort="new">Новые</button>
          <button class="filter-btn" data-sort="top">Топ</button>
        </div>
      </div>
      <div class="track-grid" id="track-grid">
        ${skeletonCards(PAGE_SIZE)}
      </div>
      <div class="feed-load-more" id="feed-load-more" style="display:none">
        <button class="btn btn--ghost" id="btn-load-more">Загрузить ещё</button>
      </div>
      <p class="feed-empty" id="feed-empty" style="display:none">Треков пока нет. Будь первым!</p>
      <p class="feed-error" id="feed-error" style="display:none"></p>
    </div>`;

	let currentSort = 'new';
	let lastDoc = null;
	let loading = false;

	// Сортировка
	container.querySelector('#feed-filters').addEventListener('click', e => {
		const btn = e.target.closest('[data-sort]');
		if (!btn || btn.dataset.sort === currentSort) return;
		container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
		btn.classList.add('filter-btn--active');
		currentSort = btn.dataset.sort;
		lastDoc = null;
		loadTracks(true);
	});

	// «Загрузить ещё»
	container.querySelector('#btn-load-more').addEventListener('click', () => {
		if (!loading) loadTracks(false);
	});

	// Первая загрузка
	loadTracks(true);

	async function loadTracks(reset) {
		if (loading) return;
		loading = true;

		const grid = container.querySelector('#track-grid');
		const emptyMsg = container.querySelector('#feed-empty');
		const errorMsg = container.querySelector('#feed-error');
		const moreBtn = container.querySelector('#feed-load-more');

		if (reset) {
			lastDoc = null;
			grid.innerHTML = skeletonCards(PAGE_SIZE);
			emptyMsg.style.display = 'none';
			errorMsg.style.display = 'none';
			moreBtn.style.display = 'none';
		}

		try {
			const sortField = currentSort === 'top' ? 'averageRating' : 'createdAt';

			let q = query(
				collection(db, 'tracks'),
				orderBy(sortField, 'desc'),
				limit(PAGE_SIZE)
			);
			if (!reset && lastDoc) {
				q = query(
					collection(db, 'tracks'),
					orderBy(sortField, 'desc'),
					startAfter(lastDoc),
					limit(PAGE_SIZE)
				);
			}

			const snap = await getDocs(q);

			if (reset) grid.innerHTML = '';

			if (snap.empty && reset) {
				emptyMsg.style.display = 'block';
				moreBtn.style.display = 'none';
				loading = false;
				return;
			}

			snap.forEach(d => {
				const track = { id: d.id, ...d.data() };
				grid.appendChild(TrackCard(track));
			});

			lastDoc = snap.docs[snap.docs.length - 1];
			moreBtn.style.display = snap.size === PAGE_SIZE ? 'block' : 'none';

		} catch (err) {
			console.error('FeedView load error:', err);
			if (reset) grid.innerHTML = '';
			errorMsg.textContent = `Ошибка загрузки: ${err.message}`;
			errorMsg.style.display = 'block';
		} finally {
			loading = false;
		}
	}

	return { element: container };
}

function skeletonCards(n) {
	return Array(n).fill(`
    <div class="track-card track-card--skeleton">
      <div class="skeleton-box track-card__cover--skeleton"></div>
      <div class="track-card__body">
        <div class="skeleton-box skeleton-line" style="width:70%;height:16px;margin-bottom:8px"></div>
        <div class="skeleton-box skeleton-line" style="width:45%;height:12px"></div>
      </div>
    </div>`).join('');
}