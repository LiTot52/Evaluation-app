// ══════════════════════════════════════════
//   RATINGWIDGET.JS
// ══════════════════════════════════════════

import { currentUser, rateTrack, getCurrentRating, getTrackById, CRITERIA } from '../store.js';
import { showToast } from '../utils.js';
import { Icons } from '../icons.js';

export async function RatingWidget(trackId, onRated) {
	const container = document.createElement('div');

	if (!currentUser) {
		container.innerHTML = `
			<div class="rating-widget">
				<div class="rating-done">
					<div class="rating-done-icon">${Icons.lock}</div>
					<p>Войдите в аккаунт, чтобы оценить трек</p>
				</div>
			</div>`;
		return container;
	}

	const track = await getTrackById(trackId);
	if (track?.uploadedBy === currentUser.uid) {
		container.innerHTML = `
			<div class="rating-widget">
				<div class="rating-done">
					<div class="rating-done-icon">${Icons.mic}</div>
					<p>Нельзя оценивать собственный трек</p>
				</div>
			</div>`;
		return container;
	}

	const existingRating = await getCurrentRating(trackId);
	const scores = {};
	CRITERIA.forEach(({ key }) => { scores[key] = existingRating?.[key] ?? 5; });

	const calcOverall = () =>
		Math.round(CRITERIA.reduce((s, { key }) => s + (scores[key] || 0), 0) / CRITERIA.length * 10) / 10;

	container.innerHTML = `
		<div class="rating-widget">
			<h3 class="rating-widget-title">${existingRating ? 'Ваша оценка' : 'Оценить трек'}</h3>
			<div class="rating-criteria">
				${CRITERIA.map(({ key, label, desc }) => `
					<div class="rating-criterion">
						<div class="rating-criterion-label">
							<div class="rating-criterion-name-wrap">
								<span class="rating-criterion-name">${label}</span>
								<span class="criterion-tooltip-wrap">
									<span class="criterion-info-btn">${Icons.info}</span>
									<span class="criterion-tooltip">${desc}</span>
								</span>
							</div>
							<span class="rating-criterion-val" data-criterion="${key}">${scores[key]}</span>
						</div>
						<input type="range" class="rating-slider" min="1" max="10"
							value="${scores[key]}" data-criterion="${key}">
					</div>`).join('')}
			</div>
			<div class="rating-total-row">
				<span class="rating-total-label">Общая оценка</span>
				<span class="rating-total-val" id="overall-rating">${calcOverall().toFixed(1)}</span>
			</div>
			<button class="btn btn--primary btn--full" id="rating-submit-btn" style="margin-top:16px">
				${existingRating ? 'Обновить оценку' : 'Сохранить оценку'}
			</button>
		</div>`;

	container.querySelectorAll('.rating-slider').forEach(slider => {
		slider.addEventListener('input', e => {
			const key = e.target.dataset.criterion;
			scores[key] = parseInt(e.target.value, 10);
			container.querySelector(`.rating-criterion-val[data-criterion="${key}"]`).textContent = scores[key];
			container.querySelector('#overall-rating').textContent = calcOverall().toFixed(1);
		});
	});

	const submitBtn = container.querySelector('#rating-submit-btn');
	submitBtn.addEventListener('click', async () => {
		try {
			submitBtn.disabled = true;
			submitBtn.innerHTML = `<span class="btn-spinner"></span> Сохранение...`;
			const result = await rateTrack(trackId, scores);
			showToast('Оценка сохранена!', 'success');
			submitBtn.innerHTML = `${Icons.check} Сохранено`;
			if (typeof onRated === 'function' && result) onRated(result.averageRating, result.totalRatings);
			setTimeout(() => {
				submitBtn.disabled = false;
				submitBtn.textContent = 'Обновить оценку';
			}, 2500);
		} catch (err) {
			showToast(err.message || 'Ошибка при сохранении', 'error');
			submitBtn.disabled = false;
			submitBtn.textContent = existingRating ? 'Обновить оценку' : 'Сохранить оценку';
		}
	});

	return container;
}