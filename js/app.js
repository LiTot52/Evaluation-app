// ══════════════════════════════════════════
//   APP.JS — Инициализация приложения
// ══════════════════════════════════════════

import {
	currentUser,
	onAuthChange,
	loginUser,
	registerUser,
	loginWithGoogle,
	logoutUser,
} from './store.js';
import { initRouter, goToView } from './router.js';
import { showToast } from './utils.js';
import './player.js'; // инициализируем глобальный плеер

// re-export для совместимости (некоторые файлы могут импортировать отсюда)
export { showToast };

export async function initApp() {
	console.log('🚀 Initializing app...');

	onAuthChange(handleAuthChange);
	initRouter();
	setupEventListeners();

	console.log('✅ App initialized');
}

// ─────────────────────────────────────────
// AUTH HANDLERS
// ─────────────────────────────────────────
async function handleAuthChange(user) {
	console.log('Auth state changed:', user?.email || 'Not logged in');
	updateHeaderUser(user);

	const hash = window.location.hash.slice(1);
	if (!user && hash === 'upload') {
		openAuthModal();
		goToView('feed');
	}
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
				: `<div class="user-avatar-sm user-avatar-letter">${name[0].toUpperCase()}</div>`
			}
					<span class="user-name-sm">${name}</span>
				</a>
				<button class="btn btn--ghost btn--sm" id="btn-logout" title="Выйти">↪</button>
			</div>`;

		document.getElementById('btn-logout').addEventListener('click', () => handleLogout());
		document.getElementById('user-profile-link').addEventListener('click', (e) => {
			e.preventDefault();
			goToView('profile', user.uid);
		});
	} else {
		headerUser.innerHTML = `<button class="btn btn--ghost" id="btn-login">Войти</button>`;
		document.getElementById('btn-login').addEventListener('click', openAuthModal);
	}
}

function openAuthModal() {
	const modal = document.getElementById('auth-modal');
	modal.classList.add('open');
	// Сбрасываем форму к вкладке «Войти»
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
		closeAuthModal();
		showToast('Успешно вошли в аккаунт!', 'success');
		goToView('feed');
	} catch (error) {
		errorEl.textContent = formatError(error.code);
	}
}

async function handleRegister(e) {
	e.preventDefault();
	const username = document.getElementById('reg-name').value.trim();
	const email = document.getElementById('reg-email').value.trim();
	const password = document.getElementById('reg-password').value;
	const errorEl = document.getElementById('reg-error');

	try {
		errorEl.textContent = '';
		if (password.length < 6) {
			errorEl.textContent = 'Пароль должен быть минимум 6 символов';
			return;
		}
		await registerUser(email, username, password);
		closeAuthModal();
		showToast('Аккаунт создан! Добро пожаловать!', 'success');
		goToView('feed');
	} catch (error) {
		errorEl.textContent = formatError(error.code);
	}
}

async function handleGoogleLogin() {
	try {
		await loginWithGoogle();
		closeAuthModal();
		showToast('Успешно вошли через Google!', 'success');
		goToView('feed');
	} catch (error) {
		console.error('Google login error:', error);
		showToast(`Ошибка входа через Google: ${formatError(error.code)}`, 'error');
	}
}

async function handleLogout() {
	try {
		await logoutUser();
		showToast('Вышли из аккаунта', 'success');
		goToView('feed');
	} catch {
		showToast('Ошибка выхода', 'error');
	}
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatError(code) {
	const errors = {
		'auth/user-not-found': 'Пользователь не найден',
		'auth/wrong-password': 'Неверный пароль',
		'auth/invalid-credential': 'Неверный email или пароль',
		'auth/email-already-in-use': 'Email уже зарегистрирован',
		'auth/weak-password': 'Пароль слишком простой',
		'auth/invalid-email': 'Неверный email',
		'auth/popup-closed-by-user': 'Окно авторизации было закрыто',
		'auth/cancelled-popup-request': 'Авторизация отменена',
	};
	return errors[code] || `Ошибка авторизации (${code})`;
}

// ─────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────
function setupEventListeners() {
	// Закрытие модалки
	document.getElementById('modal-close').addEventListener('click', closeAuthModal);
	document.getElementById('auth-modal').addEventListener('click', e => {
		if (e.target === document.getElementById('auth-modal')) closeAuthModal();
	});

	// Вкладки
	document.querySelectorAll('.modal-tab').forEach(tab => {
		tab.addEventListener('click', () => {
			const tabName = tab.dataset.tab;
			document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
			tab.classList.add('active');

			const isLogin = tabName === 'login';
			document.getElementById('form-login').style.display = isLogin ? 'flex' : 'none';
			document.getElementById('form-register').style.display = isLogin ? 'none' : 'flex';
		});
	});

	// Формы
	document.getElementById('form-login').addEventListener('submit', handleLogin);
	document.getElementById('form-register').addEventListener('submit', handleRegister);
	document.getElementById('btn-google').addEventListener('click', handleGoogleLogin);

	// Навигация
	document.querySelectorAll('[data-route]').forEach(link => {
		link.addEventListener('click', e => {
			e.preventDefault();
			const route = link.dataset.route;
			if (route === 'upload' && !currentUser) {
				openAuthModal();
				return;
			}
			goToView(route);
		});
	});

	// Подсветка активной ссылки
	const syncActiveNav = () => {
		const hash = window.location.hash.slice(1).split('/')[0];
		document.querySelectorAll('[data-route]').forEach(link => {
			link.classList.toggle('active', link.dataset.route === hash);
		});
	};
	window.addEventListener('hashchange', syncActiveNav);
	syncActiveNav();
}

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}

console.log('%c✅ App script loaded', 'color:#e8ff47;font-weight:bold');