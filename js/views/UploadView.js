// ══════════════════════════════════════════
//   UPLOADVIEW.JS
// ══════════════════════════════════════════

import { currentUser, uploadTrack, GENRES } from '../store.js';
import { showToast } from '../utils.js';
import { goToView } from '../router.js';

export async function UploadView() {
	const container = document.createElement('div');
	container.className = 'page';

	if (!currentUser) {
		container.innerHTML = `
      <div class="empty-state" style="padding-top:200px">
        <div class="empty-state-icon">🔒</div>
        <h2 class="empty-state-title">Требуется вход</h2>
        <p class="empty-state-text">Войдите, чтобы загрузить трек</p>
      </div>`;
		return { element: container };
	}

	let audioFile = null;
	let coverFile = null;

	// Генерируем опции жанров
	const genreOptions = GENRES.map(g =>
		`<option value="${g}">${g}</option>`
	).join('');

	container.innerHTML = `
    <div>
      <h1 class="page-title">Загрузить <span>Трек</span></h1>
      <div class="upload-layout">

        <!-- ФОРМА -->
        <form class="upload-form" id="upload-form">
          <div class="field">
            <label class="field-label">Название *</label>
            <input class="field-input" type="text" id="f-title" placeholder="Название трека" required>
          </div>

          <div class="field">
            <label class="field-label">Исполнитель *</label>
            <input class="field-input" type="text" id="f-artist"
              placeholder="${currentUser.displayName || 'Ваш псевдоним'}"
              value="${currentUser.displayName || ''}" required>
          </div>

          <!-- Жанр — дропдаун -->
          <div class="field">
            <label class="field-label">Жанр</label>
            <div class="select-wrapper">
              <select class="field-select" id="f-genre">
                ${genreOptions}
              </select>
              <span class="select-arrow">▾</span>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Описание</label>
            <textarea class="field-textarea" id="f-desc" placeholder="Расскажи о треке..."></textarea>
          </div>

          <!-- Аудио -->
          <div class="field">
            <label class="field-label">Аудиофайл (MP3 / WAV) *</label>
            <div class="file-drop" id="audio-drop">
              <div class="file-drop-icon">🎵</div>
              <div class="file-drop-text">Перетащите или <strong>нажмите</strong></div>
              <input type="file" id="audio-input" accept="audio/*">
            </div>
            <p class="field-hint" id="audio-hint"></p>
          </div>

          <!-- Обложка -->
          <div class="field">
            <label class="field-label">Обложка (JPG / PNG) *</label>
            <div class="file-drop" id="cover-drop">
              <div class="file-drop-icon">🖼️</div>
              <div class="file-drop-text">Перетащите или <strong>нажмите</strong></div>
              <input type="file" id="cover-input" accept="image/*">
            </div>
            <p class="field-hint" id="cover-hint"></p>
          </div>

          <!-- Прогресс -->
          <div id="upload-progress" style="display:none" class="upload-progress">
            <div class="upload-progress-label">
              <span id="prog-label">Загрузка...</span>
              <span id="prog-pct">0%</span>
            </div>
            <div class="upload-progress-bar">
              <div class="upload-progress-fill" id="prog-fill"></div>
            </div>
          </div>

          <button class="btn btn--primary btn--full" type="submit" id="submit-btn">
            Загрузить трек
          </button>
        </form>

        <!-- ПРЕВЬЮ -->
        <div class="upload-preview">
          <div class="upload-cover-preview" id="cover-preview">🖼️</div>
          <div id="audio-name" style="font-size:13px;color:var(--text-3);text-align:center;margin-top:8px"></div>
        </div>
      </div>
    </div>`;

	// ── File drop helpers ──
	const makeDrop = (dropId, inputId, hintId, onFile) => {
		const drop = container.querySelector(`#${dropId}`);
		const input = container.querySelector(`#${inputId}`);
		const hint = container.querySelector(`#${hintId}`);

		drop.addEventListener('click', () => input.click());
		input.addEventListener('change', e => e.target.files[0] && onFile(e.target.files[0], hint, drop));
		drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
		drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
		drop.addEventListener('drop', e => {
			e.preventDefault();
			drop.classList.remove('drag-over');
			if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0], hint, drop);
		});
	};

	makeDrop('audio-drop', 'audio-input', 'audio-hint', (file, hint, drop) => {
		if (!file.type.startsWith('audio/')) { showToast('Нужен аудиофайл', 'error'); return; }
		audioFile = file;
		hint.textContent = `✓ ${file.name}`;
		hint.style.color = 'var(--accent)';
		drop.querySelector('.file-drop-icon').textContent = '✅';
		container.querySelector('#audio-name').textContent = file.name;
	});

	makeDrop('cover-drop', 'cover-input', 'cover-hint', (file, hint, drop) => {
		if (!file.type.startsWith('image/')) { showToast('Нужно изображение', 'error'); return; }
		coverFile = file;
		hint.textContent = `✓ ${file.name}`;
		hint.style.color = 'var(--accent)';
		drop.querySelector('.file-drop-icon').textContent = '✅';

		const reader = new FileReader();
		reader.onload = e => {
			const prev = container.querySelector('#cover-preview');
			prev.style.backgroundImage = `url('${e.target.result}')`;
			prev.style.backgroundSize = 'cover';
			prev.textContent = '';
		};
		reader.readAsDataURL(file);
	});

	// ── Submit ──
	container.querySelector('#upload-form').addEventListener('submit', async e => {
		e.preventDefault();

		if (!audioFile || !coverFile) {
			showToast('Выбери аудио и обложку', 'error');
			return;
		}

		const submitBtn = container.querySelector('#submit-btn');
		const progBlock = container.querySelector('#upload-progress');
		const progFill = container.querySelector('#prog-fill');
		const progPct = container.querySelector('#prog-pct');
		const progLabel = container.querySelector('#prog-label');

		submitBtn.disabled = true;
		submitBtn.textContent = 'Загрузка...';
		progBlock.style.display = 'block';

		try {
			const track = await uploadTrack({
				title: container.querySelector('#f-title').value.trim(),
				artist: container.querySelector('#f-artist').value.trim(),
				genre: container.querySelector('#f-genre').value,
				description: container.querySelector('#f-desc').value.trim(),
				audioFile, coverFile,
			}, (stage, pct) => {
				progLabel.textContent = stage === 'audio' ? 'Загрузка аудио...' : 'Загрузка обложки...';
				progFill.style.width = pct + '%';
				progPct.textContent = pct + '%';
			});

			progFill.style.width = '100%';
			progPct.textContent = '100%';
			showToast('Трек загружен! 🎉', 'success');
			setTimeout(() => goToView('track', track.id), 800);

		} catch (err) {
			console.error('Upload error:', err);
			showToast('Ошибка: ' + err.message, 'error');
			submitBtn.disabled = false;
			submitBtn.textContent = 'Загрузить трек';
		}
	});

	return { element: container };
}