import { currentUser, uploadTrack } from '../store.js';
import { showToast } from '../app.js';
import { goToView } from '../router.js';

export async function UploadView() {
	const container = document.createElement('div');
	container.className = 'page';

	if (!currentUser) {
		container.innerHTML = `
			<div class="empty-state" style="padding-top: 200px;">
				<div class="empty-state-icon">🔒</div>
				<h2 class="empty-state-title">Требуется вход</h2>
				<p class="empty-state-text">Войдите в аккаунт чтобы загрузить трек</p>
			</div>
		`;
		return { element: container };
	}

	let selectedCoverFile = null;
	let selectedAudioFile = null;
	let coverPreview = null;

	const renderForm = () => {
		container.innerHTML = `
			<div>
				<h1 class="page-title">Загрузить <span>Трек</span></h1>

				<div class="upload-layout">
					<!-- FORM -->
					<form class="upload-form" id="upload-form">
						<div class="field">
							<label class="field-label">Название трека *</label>
							<input class="field-input" type="text" id="track-title" placeholder="Название трека" required>
						</div>

						<div class="field">
							<label class="field-label">Исполнитель *</label>
							<input class="field-input" type="text" id="track-artist" placeholder="Ваше имя или группа" required>
						</div>

						<div class="field">
							<label class="field-label">Жанр *</label>
							<input class="field-input" type="text" id="track-genre" placeholder="Например: Рэп, Хип-Хоп" required>
						</div>

						<div class="field">
							<label class="field-label">Описание</label>
							<textarea class="field-textarea" id="track-description" placeholder="Расскажите о вашем треке..."></textarea>
						</div>

						<div class="field">
							<label class="field-label">Аудиофайл (MP3, WAV) *</label>
							<div class="file-drop" id="audio-drop">
								<div class="file-drop-icon">🎵</div>
								<div class="file-drop-text">
									Перетащите сюда или <strong>нажмите чтобы выбрать</strong>
								</div>
								<input type="file" id="audio-input" accept="audio/mp3,audio/wav,audio/*" required>
							</div>
							<div class="field-hint" id="audio-hint"></div>
						</div>

						<div class="field">
							<label class="field-label">Обложка (PNG, JPG) *</label>
							<div class="file-drop" id="cover-drop">
								<div class="file-drop-icon">🖼️</div>
								<div class="file-drop-text">
									Перетащите сюда или <strong>нажмите чтобы выбрать</strong>
								</div>
								<input type="file" id="cover-input" accept="image/png,image/jpeg" required>
							</div>
							<div class="field-hint" id="cover-hint"></div>
						</div>

						<button class="btn btn--primary btn--full" type="submit">
							Загрузить трек
						</button>
					</form>

					<!-- PREVIEW -->
					<div class="upload-preview">
						<div class="upload-cover-preview" id="cover-preview">🖼️</div>

						<div class="upload-progress" id="upload-progress" style="display: none;">
							<div class="upload-progress-label">
								<span>Загрузка...</span>
								<span id="progress-percent">0%</span>
							</div>
							<div class="upload-progress-bar">
								<div class="upload-progress-fill" id="progress-fill"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	};

	renderForm();

	const setupFileHandlers = () => {

		const audioDrop = container.querySelector('#audio-drop');
		const audioInput = container.querySelector('#audio-input');
		const audioHint = container.querySelector('#audio-hint');

		audioDrop.addEventListener('click', () => audioInput.click());
		audioInput.addEventListener('change', (e) => {
			handleAudioSelect(e.target.files[0]);
		});

		audioDrop.addEventListener('dragover', (e) => {
			e.preventDefault();
			audioDrop.classList.add('drag-over');
		});

		audioDrop.addEventListener('dragleave', () => {
			audioDrop.classList.remove('drag-over');
		});

		audioDrop.addEventListener('drop', (e) => {
			e.preventDefault();
			audioDrop.classList.remove('drag-over');
			const files = e.dataTransfer.files;
			if (files[0]) handleAudioSelect(files[0]);
		});

		const coverDrop = container.querySelector('#cover-drop');
		const coverInput = container.querySelector('#cover-input');
		const coverHint = container.querySelector('#cover-hint');

		coverDrop.addEventListener('click', () => coverInput.click());
		coverInput.addEventListener('change', (e) => {
			handleCoverSelect(e.target.files[0]);
		});

		coverDrop.addEventListener('dragover', (e) => {
			e.preventDefault();
			coverDrop.classList.add('drag-over');
		});

		coverDrop.addEventListener('dragleave', () => {
			coverDrop.classList.remove('drag-over');
		});

		coverDrop.addEventListener('drop', (e) => {
			e.preventDefault();
			coverDrop.classList.remove('drag-over');
			const files = e.dataTransfer.files;
			if (files[0]) handleCoverSelect(files[0]);
		});
	};

	const handleAudioSelect = (file) => {
		if (!file.type.startsWith('audio/')) {
			showToast('Выберите аудиофайл', 'error');
			return;
		}
		selectedAudioFile = file;
		const audioHint = container.querySelector('#audio-hint');
		audioHint.textContent = `✓ Выбран: ${file.name}`;
		audioHint.style.color = 'var(--accent)';
	};

	const handleCoverSelect = (file) => {
		if (!file.type.startsWith('image/')) {
			showToast('Выберите изображение', 'error');
			return;
		}
		selectedCoverFile = file;
		const coverHint = container.querySelector('#cover-hint');
		coverHint.textContent = `✓ Выбран: ${file.name}`;
		coverHint.style.color = 'var(--accent)';

		const reader = new FileReader();
		reader.onload = (e) => {
			const preview = container.querySelector('#cover-preview');
			preview.style.backgroundImage = `url('${e.target.result}')`;
			preview.style.backgroundSize = 'cover';
			preview.textContent = '';
		};
		reader.readAsDataURL(file);
	};

	setupFileHandlers();

	const form = container.querySelector('#upload-form');
	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		if (!selectedAudioFile || !selectedCoverFile) {
			showToast('Выберите аудиофайл и обложку', 'error');
			return;
		}

		const title = container.querySelector('#track-title').value;
		const artist = container.querySelector('#track-artist').value;
		const genre = container.querySelector('#track-genre').value;
		const description = container.querySelector('#track-description').value;

		try {

			const progress = container.querySelector('#upload-progress');
			progress.style.display = 'block';
			const submitBtn = form.querySelector('button[type="submit"]');
			submitBtn.disabled = true;


			let currentProgress = 0;
			const progressInterval = setInterval(() => {
				if (currentProgress < 90) {
					currentProgress += Math.random() * 30;
					if (currentProgress > 90) currentProgress = 90;
					updateProgress(currentProgress);
				}
			}, 500);

			const result = await uploadTrack(title, artist, genre, description, selectedAudioFile, selectedCoverFile);

			clearInterval(progressInterval);
			updateProgress(100);

			showToast('Трек успешно загружен! 🎉', 'success');

			setTimeout(() => {
				goToView('track', result.id);
			}, 1500);
		} catch (error) {
			console.error('Upload error:', error);
			showToast('Ошибка при загрузке: ' + error.message, 'error');
			form.querySelector('button[type="submit"]').disabled = false;
		}
	});

	const updateProgress = (percent) => {
		const fill = container.querySelector('#progress-fill');
		const percentEl = container.querySelector('#progress-percent');
		fill.style.width = percent + '%';
		percentEl.textContent = Math.round(percent) + '%';
	};

	return { element: container };
}
