// ══════════════════════════════════════════
//   RATINGWIDGET.JS — Rating Input Component
// ══════════════════════════════════════════

import { currentUser, rateTrack, getCurrentRating, CRITERIA } from '../store.js';
import { showToast } from '../utils.js';

/**
 * @param {string} trackId
 * @param {function(number, number):void} [onRated]  — callback(newAvg, newCount)
 */
export async function RatingWidget(trackId, onRated) {
	const container = document.createElement('div');

	if (!currentUser) {
		container.innerHTML = `
			<div class="rating-widget">
				<div class="rating-done">
					<div class="rating-done-icon">🔒</div>
					<p>Войдите в аккаунт, чтобы оценить трек</p>
				</div>
			</div>`;
		return container;
	}

	// Загружаем существующую оценку
	const existingRating = await getCurrentRating(trackId);

	// Начальные значения — если уже оценивали, подставляем старые
	const scores = {};
	CRITERIA.forEach(({ key }) => {
		scores[key] = existingRating?.[key] ?? 5;
	});

	const calcOverall = () => {
		const sum = CRITERIA.reduce((s, { key }) => s + (scores[key] || 0), 0);
		return Math.round(sum / CRITERIA.length * 10) / 10;
	};

	const renderSliders = () => CRITERIA.map(({ key, label }) => `
		<div class="rating-criterion">
			<div class="rating-criterion-label">
				<span class="rating-criterion-name">${label}</span>
				<span class="rating-criterion-val" data-criterion="${key}">${scores[key]}</span>
			</div>
			<input
				type="range"
				class="rating-slider"
				min="1" max="10"
				value="${scores[key]}"
				data-criterion="${key}"
			>
		</div>`).join('');

	container.innerHTML = `
		<div class="rating-widget">
			<h3 class="rating-widget-title">${existingRating ? 'Ваша оценка' : 'Оценить трек'}</h3>

			<div class="rating-criteria">
				${renderSliders()}
			</div>

			<div class="rating-total-row">
				<span class="rating-total-label">Общая оценка</span>
				<span class="rating-total-val" id="overall-rating">${calcOverall().toFixed(1)}</span>
			</div>

			<button class="btn btn--primary btn--full" id="rating-submit-btn" style="margin-top:20px">
				${existingRating ? 'Обновить оценку' : 'Сохранить оценку'}
			</button>
		</div>`;

	// Ползунки
	container.querySelectorAll('.rating-slider').forEach(slider => {
		slider.addEventListener('input', e => {
			const key = e.target.dataset.criterion;
			scores[key] = parseInt(e.target.value, 10);

			// Обновляем отображение значения
			const valEl = container.querySelector(`.rating-criterion-val[data-criterion="${key}"]`);
			if (valEl) valEl.textContent = scores[key];

			// Обновляем итог
			const overallEl = container.querySelector('#overall-rating');
			if (overallEl) overallEl.textContent = calcOverall().toFixed(1);
		});
	});

	// Кнопка сохранения
	const submitBtn = container.querySelector('#rating-submit-btn');
	submitBtn.addEventListener('click', async () => {
		try {
			submitBtn.disabled = true;
			submitBtn.textContent = 'Сохранение...';

			const result = await rateTrack(trackId, scores);

			showToast('Оценка сохранена! 🎉', 'success');
			submitBtn.textContent = 'Сохранено ✓';
			submitBtn.style.background = 'var(--accent)';
			submitBtn.style.color = '#000';

			// Вызываем callback с новыми данными трека
			if (typeof onRated === 'function' && result) {
				onRated(result.averageRating, result.totalRatings);
			}

			setTimeout(() => {
				submitBtn.disabled = false;
				submitBtn.textContent = 'Обновить оценку';
				submitBtn.style.background = '';
				submitBtn.style.color = '';
			}, 2500);
		} catch (error) {
			console.error('Rating error:', error);
			showToast('Ошибка при сохранении оценки', 'error');
			submitBtn.disabled = false;
			submitBtn.textContent = existingRating ? 'Обновить оценку' : 'Сохранить оценку';
		}
	});

	return container;
}