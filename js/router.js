// ══════════════════════════════════════════
//   ROUTER.JS
// ══════════════════════════════════════════

import { FeedView } from './views/FeedView.js';
import { TrackView } from './views/TrackView.js';
import { UploadView } from './views/UploadView.js';
import { TopView } from './views/TopView.js';
import { ProfileView } from './views/ProfileView.js';
import { SearchView } from './views/SearchView.js';
import { PlaylistView } from './views/PlaylistView.js';

let _cleanup = null;
let _prevRoute = null;

export function initRouter() {
	window.addEventListener('hashchange', _route);
	_route();
}

async function _route() {
	const hash = window.location.hash.slice(1) || 'feed';
	const [route, id] = hash.split('/');

	document.querySelectorAll('[data-route]').forEach(el =>
		el.classList.toggle('active', el.dataset.route === route)
	);

	const app = document.getElementById('app');
	document.getElementById('initial-loader')?.remove();

	// Анимация выхода
	const outgoing = app.querySelector('.page, .loader');
	if (outgoing && _prevRoute !== null) {
		outgoing.classList.add('page-exit');
		await new Promise(r => setTimeout(r, 120));
	}

	app.innerHTML = '<div class="loader"><div class="loader-spinner"></div></div>';

	_cleanup?.();
	_cleanup = null;

	try {
		let result;
		switch (route) {
			case 'track': result = id ? await TrackView(id) : (goToView('feed'), null); break;
			case 'upload': result = await UploadView(); break;
			case 'top': result = await TopView(); break;
			case 'profile': result = id ? await ProfileView(id) : (goToView('feed'), null); break;
			case 'search': result = await SearchView(id || ''); break;
			case 'playlist': result = await PlaylistView(); break;
			default: result = await FeedView(); break;
		}
		if (!result) return;

		const el = result.element ?? result;
		el.classList.add('page-enter');
		app.innerHTML = '';
		app.appendChild(el);

		// Запускаем анимацию входа
		requestAnimationFrame(() => {
			requestAnimationFrame(() => el.classList.remove('page-enter'));
		});

		_cleanup = result.cleanup ?? null;
		_prevRoute = route;

		// Прокрутка вверх при переходе
		window.scrollTo({ top: 0, behavior: 'instant' });

	} catch (err) {
		console.error('Router error:', err);
		app.innerHTML = `
      <div class="page" style="text-align:center;padding-top:100px">
        <p style="color:var(--red);margin-bottom:8px;font-size:13px">${err.message}</p>
        <a class="btn btn--ghost" href="#feed">На главную</a>
      </div>`;
	}
}

export function goToView(route, id = null) {
	window.location.hash = id ? `#${route}/${id}` : `#${route}`;
}

export function getCurrentRoute() {
	return window.location.hash.slice(1).split('/')[0] || 'feed';
}