// ══════════════════════════════════════════
//   RATINGWIDGET.JS — Rating Input Component
// ══════════════════════════════════════════

import { currentUser, rateTrack, getCurrentRating } from '../store.js';
import { showToast } from '../app.js';

export async function RatingWidget(trackId) {
	const container = document.createElement('div');

	if (!currentUser) {
		container.innerHTML = `
			<div class="rating-widget">
				<p class="rating-done">
					<div class="rating-done-icon">🔒</div>
					Войдите в аккаунт чтобы оценить трек
				</p>
			</div>
		`;
		return container;
	}

	// Load existing rating
	const existingRating = await getCurrentRating(trackId);

	const criteria = [
		{ name: 'Beat', key: 'beat', label: 'Ритм и бит' },
		{ name: 'Vocals', key: 'vocals', label: 'Вокал' },
		{ name: 'Production', key: 'production', label: 'Продакшн' },
		{ name: 'Flow', key: 'flow', label: 'Флоу' }
	];

	const ratings = {
		beat: existingRating?.beat || 5,
		vocals: existingRating?.vocals || 5,
		production: existingRating?.production || 5,
		flow: existingRating?.flow || 5
	};

	const updateOverall = () => {
		const overall = (ratings.beat + ratings.vocals + ratings.production + ratings.flow) / 4;
		const overallEl = document.getElementById('overall-rating');
		if (overallEl) {
			overallEl.textContent = overall.toFixed(1);
		}
	};

	const handleSubmit = async () => {
		try {
			const submitBtn = container.querySelector('.btn--primary');
			submitBtn.disabled = true;
			submitBtn.textContent = 'Сохранение...';

			await rateTrack(trackId, ratings);

			showToast('Оценка сохранена!', 'success');
			submitBtn.textContent = 'Сохранено ✓';
			submitBtn.style.background = 'var(--accent)';

			setTimeout(() => {
				submitBtn.disabled = false;
				submitBtn.textContent = existingRating ? 'Обновить оценку' : 'Сохранить оценку';
				submitBtn.style.background = '';
			}, 2000);
		} catch (error) {
			showToast('Ошибка при сохранении оценки', 'error');
			const submitBtn = container.querySelector('.btn--primary');
			submitBtn.disabled = false;
			submitBtn.textContent = 'Сохранить оценку';
		}
	};

	container.innerHTML = `
		<div class="rating-widget">
			<h3 class="rating-widget-title">Оценить трек</h3>

			<div class="rating-criteria">
				${criteria.map(c => `
					<div class="rating-criterion">
						<div class="rating-criterion-label">
							<span class="rating-criterion-name">${c.label}</span>
							<span class="rating-criterion-val" data-criterion="${c.key}">${ratings[c.key]}</span>
						</div>
						<input
							type="range"
							class="rating-slider"
							min="1"
							max="10"
							value="${ratings[c.key]}"
							data-criterion="${c.key}"
						>
					</div>
				`).join('')}
			</div>

			<div class="rating-total-row">
				<span class="rating-total-label">Общая оценка</span>
				<span class="rating-total-val" id="overall-rating">${((ratings.beat + ratings.vocals + ratings.production + ratings.flow) / 4).toFixed(1)}</span>
			</div>

			<button class="btn btn--primary btn--full" style="margin-top: 20px;">
				${existingRating ? 'Обновить оценку' : 'Сохранить оценку'}
			</button>
		</div>
	`;

	// Set up slider listeners
	const sliders = container.querySelectorAll('.rating-slider');
	sliders.forEach(slider => {
		slider.addEventListener('input', (e) => {
			const criterion = e.target.dataset.criterion;
			const value = parseInt(e.target.value);
			ratings[criterion] = value;

			// Update display
			const display = container.querySelector(`[data-criterion="${criterion}"]`);
			display.textContent = value;

			updateOverall();
		});
	});

	// Submit button
	const submitBtn = container.querySelector('.btn--primary');
	submitBtn.addEventListener('click', handleSubmit);

	return container;
}
