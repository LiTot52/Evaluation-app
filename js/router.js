// ══════════════════════════════════════════
//   ROUTER.JS
// ══════════════════════════════════════════

import { FeedView } from './views/FeedView.js';
import { TrackView } from './views/TrackView.js';
import { UploadView } from './views/UploadView.js';
import { TopView } from './views/TopView.js';
import { ProfileView } from './views/ProfileView.js';

let _cleanup = null;

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
			default: result = await FeedView(); break;
		}
		if (!result) return;
		app.innerHTML = '';
		app.appendChild(result.element ?? result);
		_cleanup = result.cleanup ?? null;
	} catch (err) {
		console.error('Router error:', err);
		app.innerHTML = `
      <div class="page" style="text-align:center;padding-top:100px">
        <p style="color:var(--text-2);margin-bottom:24px">${err.message}</p>
        <a class="btn btn--primary" href="#feed">На главную</a>
      </div>`;
	}
}

export function goToView(route, id = null) {
	window.location.hash = id ? `#${route}/${id}` : `#${route}`;
}

export function getCurrentRoute() {
	return window.location.hash.slice(1).split('/')[0] || 'feed';
}