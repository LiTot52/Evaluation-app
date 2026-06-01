import {
	currentUser,
	onAuthChange,
	loginUser,
	registerUser,
	loginWithGoogle,
	logoutUser,
	loadAllTracks
} from './store.js';
import { initRouter, goToView } from './router.js';


export async function initApp() {
	console.log('🚀 Initializing app...');

	onAuthChange(handleAuthChange);

	initRouter();

	setupEventListeners();

	await loadAllTracks();

	console.log('✅ App initialized');
}

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
			<div class="user-info" style="display: flex; align-items: center; gap: 12px; cursor: pointer;" id="user-menu">
				${avatar ? `<img src="${avatar}" alt="${name}" class="user-avatar-sm">` : `<div class="user-avatar-sm" style="background: var(--accent); display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold;">${name[0]}</div>`}
				<span class="user-name-sm">${name}</span>
			</div>
		`;

		document.getElementById('user-menu').addEventListener('click', () => {
			const confirmed = confirm(`Выйти из аккаунта ${name}?`);
			if (confirmed) handleLogout();
		});
	} else {
		headerUser.innerHTML = `<button class="btn btn--ghost" id="btn-login">Войти</button>`;
		document.getElementById('btn-login').addEventListener('click', openAuthModal);
	}
}

function openAuthModal() {
	const modal = document.getElementById('auth-modal');
	modal.classList.add('open');
	document.getElementById('form-login').style.display = 'flex';
	document.getElementById('form-register').style.display = 'none';
}

function closeAuthModal() {
	const modal = document.getElementById('auth-modal');
	modal.classList.remove('open');
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
	const username = document.getElementById('reg-name').value;
	const email = document.getElementById('reg-email').value;
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
		showToast('Ошибка входа через Google', 'error');
	}
}

async function handleLogout() {
	try {
		await logoutUser();
		showToast('Вышли из аккаунта', 'success');
		goToView('feed');
	} catch (error) {
		showToast('Ошибка выхода', 'error');
	}
}


export function showToast(message, type = 'success') {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.className = `toast show ${type}`;

	setTimeout(() => {
		toast.classList.remove('show');
	}, 3000);
}

function formatError(code) {
	const errors = {
		'auth/user-not-found': 'Пользователь не найден',
		'auth/wrong-password': 'Неверный пароль',
		'auth/email-already-in-use': 'Email уже зарегистрирован',
		'auth/weak-password': 'Пароль слишком простой',
		'auth/invalid-email': 'Неверный email'
	};
	return errors[code] || 'Ошибка авторизации';
}


function setupEventListeners() {

	const modal = document.getElementById('auth-modal');
	const modalClose = document.getElementById('modal-close');
	const modalOverlay = modal;

	modalClose.addEventListener('click', closeAuthModal);
	modalOverlay.addEventListener('click', (e) => {
		if (e.target === modalOverlay) closeAuthModal();
	});


	const tabs = document.querySelectorAll('.modal-tab');
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			const tabName = tab.dataset.tab;
			tabs.forEach(t => t.classList.remove('active'));
			tab.classList.add('active');

			const loginForm = document.getElementById('form-login');
			const registerForm = document.getElementById('form-register');

			if (tabName === 'login') {
				loginForm.style.display = 'flex';
				registerForm.style.display = 'none';
			} else {
				loginForm.style.display = 'none';
				registerForm.style.display = 'flex';
			}
		});
	});


	document.getElementById('form-login').addEventListener('submit', handleLogin);
	document.getElementById('form-register').addEventListener('submit', handleRegister);
	document.getElementById('btn-google').addEventListener('click', handleGoogleLogin);


	const navLinks = document.querySelectorAll('[data-route]');
	navLinks.forEach(link => {
		link.addEventListener('click', (e) => {
			e.preventDefault();
			const route = link.dataset.route;


			if (route === 'upload' && !currentUser) {
				openAuthModal();
				return;
			}

			goToView(route);
		});
	});


	window.addEventListener('hashchange', () => {
		const hash = window.location.hash.slice(1).split('/')[0];
		navLinks.forEach(link => {
			link.classList.toggle('active', link.dataset.route === hash);
		});
	});
}


if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}

console.log('%c✅ App script loaded', 'color:#e8ff47; font-weight:bold');
