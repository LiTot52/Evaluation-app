// ══════════════════════════════════════════
//   SEARCHVIEW.JS
// ══════════════════════════════════════════

import { searchTracks } from '../store.js';
import { TrackCard } from '../components/TrackCard.js';

export async function SearchView(initialQuery = '') {
	const container = document.createElement('div');
	container.className = 'page';

	container.innerHTML = `
		<div class="search-page">
			<h1 class="page-title">Поиск <span>треков</span></h1>
			<div class="search-bar-wrap">
				<input class="search-input" id="search-input" type="text"
					placeholder="Трек, исполнитель, жанр..."
					value="${initialQuery}" autocomplete="off">
				<span class="search-icon">⌕</span>
			</div>
			<div id="search-results" class="search-results"></div>
		</div>`;

	const input = container.querySelector('#search-input');
	const results = container.querySelector('#search-results');

	let debounceTimer = null;

	const doSearch = async (q) => {
		if (!q.trim()) {
			results.innerHTML = '<p class="search-hint">Введите запрос для поиска</p>';
			return;
		}
		results.innerHTML = '<div class="loader" style="min-height:120px"><div class="loader-spinner"></div></div>';
		try {
			const tracks = await searchTracks(q);
			results.innerHTML = '';
			if (tracks.length === 0) {
				results.innerHTML = `<p class="search-hint">Ничего не найдено по запросу «${q}»</p>`;
				return;
			}
			const grid = document.createElement('div');
			grid.className = 'track-grid';
			tracks.forEach(t => grid.appendChild(TrackCard(t)));
			results.appendChild(grid);
		} catch (err) {
			results.innerHTML = `<p class="search-hint" style="color:var(--red)">${err.message}</p>`;
		}
	};

	input.addEventListener('input', e => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => doSearch(e.target.value), 350);
	});

	// Начальный поиск если есть query
	if (initialQuery) {
		doSearch(initialQuery);
	} else {
		results.innerHTML = '<p class="search-hint">Введите запрос для поиска</p>';
	}

	// Фокус на поле
	setTimeout(() => input.focus(), 100);

	return { element: container };
}