// ══════════════════════════════════════════
//   UTILS.JS — общие утилиты
// ══════════════════════════════════════════

/**
 * Показать уведомление (toast).
 * Работает без импорта из app.js, чтобы не было циклических зависимостей.
 */
export function showToast(message, type = 'success') {
	const toast = document.getElementById('toast');
	if (!toast) return;
	toast.textContent = message;
	toast.className = `toast show ${type}`;
	clearTimeout(toast._hideTimer);
	toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/**
 * Форматирование секунд → "M:SS"
 */
export function formatTime(sec) {
	if (!isFinite(sec) || sec < 0) return '0:00';
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}