import { db, auth, storage } from '../firebase-config.js';
import {
	collection, addDoc, serverTimestamp, doc, updateDoc, increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
	ref, uploadBytesResumable, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ─── Список жанров ───────────────────────────────────────────────────────────
const GENRES = [
	// Хип-хоп поджанры
	'Хардкор рэп',
	'Трэп',
	'Дрилл',
	'Бумбэп',
	'Олдскул',
	'Клауд рэп',
	'Лоуфай хип-хоп',
	'Джазовый рэп',
	'Гангста рэп',
	'Альтернативный рэп',
	'Хип-хоп',
	'Мумбл рэп',
	'Фонк',
	'Phonk',
	'R&B / Хип-хоп',
	// Другие жанры
	'R&B',
	'Поп',
	'Электронная',
	'Рок',
	'Джаз',
	'Соул',
	'Регги',
	'Латин',
	'Афробит',
	// Freestyle / экспериментальные
	'Фристайл',
	'Экспериментальный',
	'Другое',
];

// ─── Render ───────────────────────────────────────────────────────────────────
export function renderUploadView(container) {
	const user = auth.currentUser;

	if (!user) {
		container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__text">Войдите, чтобы загрузить трек</p>
      </div>`;
		return;
	}

	const genreOptions = GENRES.map(g => `<option value="${g}">${g}</option>`).join('');

	container.innerHTML = `
    <div class="upload-page">
      <div class="upload-card">
        <h1 class="upload-card__title">Загрузить трек</h1>

        <div class="field">
          <label class="field-label" for="track-title">Название трека *</label>
          <input class="field-input" id="track-title" type="text" placeholder="Название трека" maxlength="120" required>
        </div>

        <div class="field">
          <label class="field-label" for="track-artist">Исполнитель *</label>
          <input class="field-input" id="track-artist" type="text" placeholder="Твой псевдоним"
                 value="${escHtml(user.displayName || '')}" maxlength="80" required>
        </div>

        <div class="field">
          <label class="field-label" for="track-genre">Жанр *</label>
          <select class="field-input field-select" id="track-genre">
            <option value="" disabled selected>— Выберите жанр —</option>
            ${genreOptions}
          </select>
        </div>

        <div class="field">
          <label class="field-label" for="track-desc">Описание</label>
          <textarea class="field-input field-textarea" id="track-desc"
                    placeholder="О чём трек, вдохновение, история..." rows="3" maxlength="500"></textarea>
        </div>

        <div class="field">
          <label class="field-label">Аудиофайл * <span class="field-hint">(MP3 / WAV, до 50 МБ)</span></label>
          <label class="file-drop" id="audio-drop" for="audio-input">
            <span class="file-drop__icon">🎵</span>
            <span class="file-drop__text" id="audio-label">Нажмите или перетащите аудиофайл</span>
            <input class="file-drop__input" id="audio-input" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav">
          </label>
        </div>

        <div class="field">
          <label class="field-label">Обложка <span class="field-hint">(JPG / PNG, до 5 МБ)</span></label>
          <label class="file-drop" id="cover-drop" for="cover-input">
            <span class="file-drop__icon" id="cover-preview-icon">🖼</span>
            <span class="file-drop__text" id="cover-label">Нажмите или перетащите обложку</span>
            <input class="file-drop__input" id="cover-input" type="file" accept="image/jpeg,image/png,image/webp">
          </label>
          <div id="cover-preview-wrap" style="display:none;margin-top:8px;">
            <img id="cover-preview-img" style="max-height:120px;border-radius:8px;object-fit:cover;" alt="Предпросмотр обложки">
          </div>
        </div>

        <!-- Прогресс -->
        <div class="upload-progress" id="upload-progress" style="display:none">
          <div class="upload-progress__bar-wrap">
            <div class="upload-progress__bar" id="progress-bar"></div>
          </div>
          <p class="upload-progress__label" id="progress-label">Загрузка...</p>
        </div>

        <p class="upload-error" id="upload-error"></p>

        <button class="btn btn--primary btn--full" id="btn-upload-submit">
          Загрузить трек
        </button>
      </div>
    </div>`;

	// ── слушатели файловых инпутов ──
	const audioInput = document.getElementById('audio-input');
	const coverInput = document.getElementById('cover-input');

	audioInput.addEventListener('change', () => {
		const f = audioInput.files[0];
		document.getElementById('audio-label').textContent = f ? f.name : 'Нажмите или перетащите аудиофайл';
	});

	coverInput.addEventListener('change', () => {
		const f = coverInput.files[0];
		if (!f) return;
		document.getElementById('cover-label').textContent = f.name;
		const reader = new FileReader();
		reader.onload = e => {
			document.getElementById('cover-preview-img').src = e.target.result;
			document.getElementById('cover-preview-wrap').style.display = 'block';
		};
		reader.readAsDataURL(f);
	});

	// drag-and-drop для аудио
	setupDrop('audio-drop', audioInput, 'audio-label');
	setupDrop('cover-drop', coverInput, 'cover-label');

	// ── кнопка отправки ──
	document.getElementById('btn-upload-submit').addEventListener('click', () => handleUpload(user));
}

// ─── Drag-and-drop хелпер ────────────────────────────────────────────────────
function setupDrop(dropId, inputEl, labelId) {
	const drop = document.getElementById(dropId);
	if (!drop) return;
	drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('file-drop--over'); });
	drop.addEventListener('dragleave', () => drop.classList.remove('file-drop--over'));
	drop.addEventListener('drop', e => {
		e.preventDefault();
		drop.classList.remove('file-drop--over');
		const files = e.dataTransfer.files;
		if (files.length) {
			// Перебрасываем файл в input
			const dt = new DataTransfer();
			dt.items.add(files[0]);
			inputEl.files = dt.files;
			document.getElementById(labelId).textContent = files[0].name;
		}
	});
}

// ─── Логика загрузки ─────────────────────────────────────────────────────────
async function handleUpload(user) {
	const title = document.getElementById('track-title')?.value.trim();
	const artist = document.getElementById('track-artist')?.value.trim();
	const genre = document.getElementById('track-genre')?.value;
	const desc = document.getElementById('track-desc')?.value.trim();
	const audioFile = document.getElementById('audio-input')?.files[0];
	const coverFile = document.getElementById('cover-input')?.files[0];
	const errorEl = document.getElementById('upload-error');
	const submitBtn = document.getElementById('btn-upload-submit');

	// Сброс ошибок
	errorEl.textContent = '';

	// Валидация
	if (!title) { errorEl.textContent = 'Введите название трека'; return; }
	if (!artist) { errorEl.textContent = 'Введите имя исполнителя'; return; }
	if (!genre) { errorEl.textContent = 'Выберите жанр'; return; }
	if (!audioFile) { errorEl.textContent = 'Выберите аудиофайл'; return; }

	const MAX_AUDIO = 50 * 1024 * 1024;
	const MAX_COVER = 5 * 1024 * 1024;
	if (audioFile.size > MAX_AUDIO) { errorEl.textContent = 'Аудиофайл слишком большой (макс. 50 МБ)'; return; }
	if (coverFile && coverFile.size > MAX_COVER) { errorEl.textContent = 'Обложка слишком большая (макс. 5 МБ)'; return; }

	// Блокируем кнопку
	submitBtn.disabled = true;
	submitBtn.textContent = 'Загружаем...';
	showProgress(0, 'Подготовка...');

	try {
		const ts = Date.now();

		// 1. Загрузить аудио
		showProgress(5, 'Загружаем аудио...');
		const audioUrl = await uploadFile(
			audioFile,
			`tracks/${user.uid}/${ts}_${sanitizeFilename(audioFile.name)}`,
			pct => showProgress(5 + pct * 0.6, `Загружаем аудио… ${pct}%`)
		);

		// 2. Загрузить обложку (если есть)
		let coverUrl = null;
		if (coverFile) {
			showProgress(65, 'Загружаем обложку...');
			coverUrl = await uploadFile(
				coverFile,
				`covers/${user.uid}/${ts}_${sanitizeFilename(coverFile.name)}`,
				pct => showProgress(65 + pct * 0.2, `Загружаем обложку… ${pct}%`)
			);
		}

		// 3. Получить длительность аудио
		let duration = 0;
		try {
			duration = await getAudioDuration(audioFile);
		} catch (_) { /* не критично */ }

		// 4. Сохранить в Firestore
		showProgress(88, 'Сохраняем...');
		const trackRef = await addDoc(collection(db, 'tracks'), {
			title,
			artist,
			genre,
			description: desc || '',
			uploadedBy: user.uid,
			uploadedByName: user.displayName || artist,
			audioUrl,
			coverUrl: coverUrl || null,
			averageRating: 0,
			totalRatings: 0,
			ratingBreakdown: { rhymes: 0, structure: 0, style: 0, charisma: 0, vibe: 0 },
			duration,
			createdAt: serverTimestamp()
		});

		// 5. Обновить счётчик треков пользователя
		try {
			await updateDoc(doc(db, 'users', user.uid), {
				uploadsCount: increment(1)
			});
		} catch (_) { /* поле может не существовать — не критично */ }

		showProgress(100, 'Готово!');

		// Переход на страницу трека через 500мс
		setTimeout(() => {
			window.location.hash = `#track/${trackRef.id}`;
		}, 500);

	} catch (err) {
		console.error('Upload error:', err);
		errorEl.textContent = `Ошибка загрузки: ${err.message}`;
		hideProgress();
		submitBtn.disabled = false;
		submitBtn.textContent = 'Загрузить трек';
	}
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Загружает файл в Firebase Storage, вызывает onProgress(0-100) */
function uploadFile(file, path, onProgress) {
	return new Promise((resolve, reject) => {
		const storageRef = ref(storage, path);
		const task = uploadBytesResumable(storageRef, file);

		task.on(
			'state_changed',
			snap => {
				const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
				onProgress(pct);
			},
			err => reject(err),
			async () => {
				try {
					const url = await getDownloadURL(task.snapshot.ref);
					resolve(url);
				} catch (e) {
					reject(e);
				}
			}
		);
	});
}

/** Получает длительность аудиофайла в секундах */
function getAudioDuration(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const audio = new Audio();
		audio.addEventListener('loadedmetadata', () => {
			URL.revokeObjectURL(url);
			resolve(Math.round(audio.duration));
		});
		audio.addEventListener('error', reject);
		audio.src = url;
	});
}

function showProgress(pct, label) {
	const wrap = document.getElementById('upload-progress');
	const bar = document.getElementById('progress-bar');
	const lbl = document.getElementById('progress-label');
	if (!wrap) return;
	wrap.style.display = 'block';
	if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
	if (lbl) lbl.textContent = label || '';
}

function hideProgress() {
	const wrap = document.getElementById('upload-progress');
	if (wrap) wrap.style.display = 'none';
}

function sanitizeFilename(name) {
	return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
}

function escHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}