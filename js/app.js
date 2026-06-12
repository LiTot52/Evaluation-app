// ══════════════════════════════════════════
//   APP.JS
// ══════════════════════════════════════════

import {
	currentUser, onAuthChange, loginUser, registerUser,
	loginWithGoogle, logoutUser,
	subscribeToNotifications, getNotifications, markNotificationsRead,
} from './store.js';
import { initRouter, goToView } from './router.js';
import { showToast } from './utils.js';
import { Icons } from './icons.js';
import './player.js';

export { showToast };

export async function initApp() {
	onAuthChange(handleAuthChange);
	initRouter();
	setupEventListeners();
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
let _unsubNotif = null;

async function handleAuthChange(user) {
	updateHeaderUser(user);
	if (_unsubNotif) { _unsubNotif(); _unsubNotif = null; }

	const notifBtn = document.getElementById('btn-notifications');
	const notifBadge = document.getElementById('notif-badge');

	if (user && notifBtn) {
		notifBtn.style.display = 'flex';
		_unsubNotif = subscribeToNotifications(count => {
			notifBadge.style.display = count > 0 ? 'flex' : 'none';
			notifBadge.textContent = count > 9 ? '9+' : count;
		});
	} else if (notifBtn) {
		notifBtn.style.display = 'none';
	}

	const hash = window.location.hash.slice(1);
	if (!user && hash === 'upload') { openAuthModal(); goToView('feed'); }
}

function updateHeaderUser(user) {
	const headerUser = document.getElementById('header-user');
	if (!headerUser) return;

	if (user) {
		const name = user.displayName || user.email.split('@')[0];
		const avatar = user.photoURL;
		headerUser.innerHTML = `
			<div class="header-user-wrap" id="user-menu-wrap">
				<a href="#profile/${user.uid}" class="user-info-link" id="user-profile-link">
					${avatar
				? `<img src="${avatar}" alt="${name}" class="user-avatar-sm">`
				: `<div class="user-avatar-sm user-avatar-letter">${name[0].toUpperCase()}</div>`}
					<span class="user-name-sm">${name}</span>
				</a>
				<button class="btn btn--ghost btn--sm" id="btn-logout" title="Выйти">
					${Icons.logout}
				</button>
			</div>`;
		document.getElementById('btn-logout').addEventListener('click', () => handleLogout());
		document.getElementById('user-profile-link').addEventListener('click', e => {
			e.preventDefault(); goToView('profile', user.uid);
		});
	} else {
		headerUser.innerHTML = `<button class="btn btn--ghost" id="btn-login">Войти</button>`;
		document.getElementById('btn-login').addEventListener('click', openAuthModal);
	}
}

function openAuthModal() {
	document.getElementById('auth-modal').classList.add('open');
	document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
	document.querySelector('.modal-tab[data-tab="login"]').classList.add('active');
	document.getElementById('form-login').style.display = 'flex';
	document.getElementById('form-register').style.display = 'none';
	document.getElementById('login-error').textContent = '';
	document.getElementById('reg-error').textContent = '';
}

function closeAuthModal() {
	document.getElementById('auth-modal').classList.remove('open');
}

async function handleLogin(e) {
	e.preventDefault();
	const email = document.getElementById('login-email').value;
	const password = document.getElementById('login-password').value;
	const errorEl = document.getElementById('login-error');
	try {
		errorEl.textContent = '';
		await loginUser(email, password);
		closeAuthModal(); showToast('Вошли в аккаунт', 'success'); goToView('feed');
	} catch (err) { errorEl.textContent = formatError(err.code); }
}

async function handleRegister(e) {
	e.preventDefault();
	const username = document.getElementById('reg-name').value.trim();
	const email = document.getElementById('reg-email').value.trim();
	const password = document.getElementById('reg-password').value;
	const errorEl = document.getElementById('reg-error');
	try {
		errorEl.textContent = '';
		if (password.length < 6) { errorEl.textContent = 'Пароль минимум 6 символов'; return; }
		await registerUser(email, username, password);
		closeAuthModal(); showToast('Аккаунт создан!', 'success'); goToView('feed');
	} catch (err) { errorEl.textContent = formatError(err.code); }
}

async function handleGoogleLogin() {
	try {
		await loginWithGoogle(); closeAuthModal(); showToast('Вошли через Google', 'success'); goToView('feed');
	} catch (err) { showToast(formatError(err.code), 'error'); }
}

async function handleLogout() {
	try { await logoutUser(); showToast('Вышли из аккаунта', 'success'); goToView('feed'); }
	catch { showToast('Ошибка выхода', 'error'); }
}

function formatError(code) {
	const m = {
		'auth/user-not-found': 'Пользователь не найден',
		'auth/wrong-password': 'Неверный пароль',
		'auth/invalid-credential': 'Неверный email или пароль',
		'auth/email-already-in-use': 'Email уже зарегистрирован',
		'auth/weak-password': 'Пароль слишком простой',
		'auth/invalid-email': 'Неверный email',
		'auth/popup-closed-by-user': 'Окно авторизации закрыто',
	};
	return m[code] || `Ошибка (${code})`;
}

// ─────────────────────────────────────────
// УВЕДОМЛЕНИЯ
// ─────────────────────────────────────────
async function showNotificationsPanel() {
	document.querySelector('.notif-panel')?.remove();
	const panel = document.createElement('div');
	panel.className = 'notif-panel';
	panel.innerHTML = `
		<div class="notif-panel-header">
			<span class="notif-panel-title">Уведомления</span>
			<button class="notif-panel-close" id="notif-close">${Icons.close}</button>
		</div>
		<div class="notif-panel-list" id="notif-list">
			<div class="loader" style="min-height:80px"><div class="loader-spinner"></div></div>
		</div>`;
	document.body.appendChild(panel);
	panel.querySelector('#notif-close').addEventListener('click', () => panel.remove());
	setTimeout(() => {
		document.addEventListener('click', function close(e) {
			if (!panel.contains(e.target) && e.target.id !== 'btn-notifications') {
				panel.remove(); document.removeEventListener('click', close);
			}
		});
	}, 50);

	const notifs = await getNotifications();
	await markNotificationsRead();
	document.getElementById('notif-badge').style.display = 'none';

	const list = panel.querySelector('#notif-list');
	if (notifs.length === 0) { list.innerHTML = '<p class="notif-empty">Нет уведомлений</p>'; return; }

	const iconMap = { rating: Icons.star, comment: Icons.comment };
	list.innerHTML = notifs.map(n => `
		<div class="notif-item ${n.read ? '' : 'notif-item--unread'}" data-track="${n.trackId}">
			<span class="notif-icon">${iconMap[n.type] || Icons.bell}</span>
			<div class="notif-body">
				<div class="notif-text">
					<strong>${n.fromName}</strong>
					${n.type === 'rating' ? 'оценил твой трек' : 'прокомментировал'}
					«${n.trackTitle}»
				</div>
				${n.text ? `<div class="notif-preview">${n.text}</div>` : ''}
			</div>
		</div>`).join('');

	list.querySelectorAll('[data-track]').forEach(el => {
		el.addEventListener('click', () => { panel.remove(); goToView('track', el.dataset.track); });
	});
}

// ─────────────────────────────────────────
// СОБЫТИЯ
// ─────────────────────────────────────────
function setupEventListeners() {
	// Тема
	const savedTheme = localStorage.getItem('theme') || 'dark';
	if (savedTheme === 'light') _applyTheme('light');

	document.getElementById('btn-theme').addEventListener('click', () => {
		const isLight = document.documentElement.dataset.theme === 'light';
		_applyTheme(isLight ? 'dark' : 'light');
	});

	// Мобильный профиль
	document.getElementById('mobile-profile-btn')?.addEventListener('click', () => {
		if (currentUser) {
			goToView('profile', currentUser.uid);
		} else {
			openAuthModal();
		}
	});

	// Синхронизация мобильной навигации с плеером
	const mobileNav = document.getElementById('mobile-nav');
	const globalPlayer = document.getElementById('global-player');
	if (mobileNav && globalPlayer) {
		const syncNav = () => {
			const playerActive = globalPlayer.classList.contains('active');
			mobileNav.classList.toggle('player-hidden', !playerActive);
		};
		new MutationObserver(syncNav).observe(globalPlayer, { attributes: true, attributeFilter: ['class'] });
	}
	document.getElementById('modal-close').addEventListener('click', closeAuthModal);
	document.getElementById('auth-modal').addEventListener('click', e => {
		if (e.target === document.getElementById('auth-modal')) closeAuthModal();
	});

	document.querySelectorAll('.modal-tab').forEach(tab => {
		tab.addEventListener('click', () => {
			const isLogin = tab.dataset.tab === 'login';
			document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
			tab.classList.add('active');
			document.getElementById('form-login').style.display = isLogin ? 'flex' : 'none';
			document.getElementById('form-register').style.display = isLogin ? 'none' : 'flex';
		});
	});

	document.getElementById('form-login').addEventListener('submit', handleLogin);
	document.getElementById('form-register').addEventListener('submit', handleRegister);
	document.getElementById('btn-google').addEventListener('click', handleGoogleLogin);

	document.getElementById('btn-notifications')?.addEventListener('click', () => showNotificationsPanel());

	document.querySelectorAll('[data-route]').forEach(link => {
		link.addEventListener('click', e => {
			e.preventDefault();
			if (link.dataset.route === 'upload' && !currentUser) { openAuthModal(); return; }
			goToView(link.dataset.route);
		});
	});

	const syncNav = () => {
		const hash = window.location.hash.slice(1).split('/')[0];
		document.querySelectorAll('[data-route]').forEach(l => l.classList.toggle('active', l.dataset.route === hash));
	};
	window.addEventListener('hashchange', syncNav);
	syncNav();
}

// ─────────────────────────────────────────
// ТЕМА
// ─────────────────────────────────────────
function _applyTheme(theme) {
	document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
	localStorage.setItem('theme', theme);
	const moon = document.getElementById('theme-icon-moon');
	const sun = document.getElementById('theme-icon-sun');
	if (moon) moon.style.display = theme === 'light' ? 'none' : '';
	if (sun) sun.style.display = theme === 'light' ? '' : 'none';
}

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}