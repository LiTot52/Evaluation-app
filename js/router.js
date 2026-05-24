// ══════════════════════════════════════════
//   ROUTER.JS — Hash-Based Routing
// ══════════════════════════════════════════

import { FeedView } from './views/FeedView.js';
import { TrackView } from './views/TrackView.js';
import { UploadView } from './views/UploadView.js';

let currentView = null;

// ─────────────────────────────────────────
// ROUTER INIT
// ─────────────────────────────────────────
export function initRouter() {
	window.addEventListener('hashchange', handleRouteChange);
	handleRouteChange();
}

function handleRouteChange() {
	const hash = window.location.hash.slice(1) || 'feed';
	const [route, id] = hash.split('/');

	console.log('🔀 Route changed:', route, id);
	renderView(route, id);
}

// ─────────────────────────────────────────
// VIEW RENDERING
// ─────────────────────────────────────────
async function renderView(route, id) {
	const app = document.getElementById('app');
	const initialLoader = document.getElementById('initial-loader');

	// Remove initial loader
	if (initialLoader && initialLoader.parentNode === app) {
		initialLoader.remove();
	}

	// Show loader while rendering
	app.innerHTML = '<div class="loader"><div class="loader-spinner"></div></div>';

	try {
		if (currentView) {
			currentView.cleanup?.();
		}

		switch (route) {
			case 'feed':
				currentView = await FeedView();
				break;
			case 'track':
				if (!id) {
					goToView('feed');
					return;
				}
				currentView = await TrackView(id);
				break;
			case 'upload':
				currentView = await UploadView();
				break;
			default:
				goToView('feed');
				return;
		}

		if (currentView) {
			app.innerHTML = '';
			app.appendChild(currentView.element || currentView);
		}
	} catch (error) {
		console.error('Error rendering view:', error);
		app.innerHTML = `
			<div class="page" style="text-align: center; padding-top: 100px;">
				<h2>Ошибка загрузки страницы</h2>
				<p>${error.message}</p>
				<button class="btn btn--primary" onclick="window.location.hash = '#feed'">
					Вернуться на главную
				</button>
			</div>
		`;
	}
}

// ─────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────
export function goToView(route, id = null) {
	if (id) {
		window.location.hash = `#${route}/${id}`;
	} else {
		window.location.hash = `#${route}`;
	}
}

export function getCurrentRoute() {
	return window.location.hash.slice(1).split('/')[0] || 'feed';
}

console.log('%c✅ Router initialized', 'color:#e8ff47; font-weight:bold');
