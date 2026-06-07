// ══════════════════════════════════════════
//   COMMENTS.JS
// ══════════════════════════════════════════

import { currentUser, addComment, getComments, deleteComment } from '../store.js';
import { showToast } from '../utils.js';
import { Icons } from '../icons.js';

function timeAgo(date) {
	const d = date?.toDate?.() ?? new Date(date ?? 0);
	const s = Math.floor((Date.now() - d) / 1000);
	if (s < 60) return 'только что';
	if (s < 3600) return `${Math.floor(s / 60)} мин`;
	if (s < 86400) return `${Math.floor(s / 3600)} ч`;
	return `${Math.floor(s / 86400)} д`;
}

function _escape(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function renderComment(c) {
	const el = document.createElement('div');
	el.className = 'comment';
	el.dataset.id = c.id;
	const letter = (c.userName || '?')[0].toUpperCase();
	const isOwn = currentUser?.uid === c.userId;

	el.innerHTML = `
		<div class="comment-avatar"${c.userAvatar ? ` style="background-image:url('${c.userAvatar}')"` : ''}>
			${c.userAvatar ? '' : letter}
		</div>
		<div class="comment-body">
			<div class="comment-header">
				<span class="comment-name">${c.userName || 'Аноним'}</span>
				<span class="comment-time">${timeAgo(c.createdAt)}</span>
				${isOwn ? `<button class="comment-delete" data-id="${c.id}">${Icons.close}</button>` : ''}
			</div>
			<p class="comment-text">${_escape(c.text)}</p>
		</div>`;

	if (isOwn) {
		el.querySelector('.comment-delete').addEventListener('click', async () => {
			try { await deleteComment(c.id); el.remove(); }
			catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
		});
	}
	return el;
}

export async function CommentsSection(trackId) {
	const section = document.createElement('div');
	section.className = 'comments-section';

	const comments = await getComments(trackId);

	section.innerHTML = `
		<div class="comments-header">
			<span class="section-label">Комментарии</span>
			<span class="comments-count">${comments.length}</span>
		</div>
		<div class="comments-list" id="comments-list"></div>
		${currentUser ? `
		<div class="comment-form">
			<div class="comment-form-avatar"${currentUser.photoURL ? ` style="background-image:url('${currentUser.photoURL}')"` : ''}>
				${currentUser.photoURL ? '' : (currentUser.displayName || '?')[0].toUpperCase()}
			</div>
			<div class="comment-form-input-wrap">
				<textarea class="comment-input" id="comment-input"
					placeholder="Напишите комментарий..." rows="1"></textarea>
				<button class="btn btn--primary btn--sm comment-submit" id="comment-submit">
					Отправить
				</button>
			</div>
		</div>` : `
		<div class="comments-login-prompt">
			<button class="btn btn--ghost btn--sm" id="comment-login-btn">Войдите, чтобы комментировать</button>
		</div>`}`;

	const list = section.querySelector('#comments-list');
	const countEl = section.querySelector('.comments-count');

	if (comments.length === 0) {
		list.innerHTML = '<p class="comments-empty">Будь первым кто оставит комментарий</p>';
	} else {
		comments.forEach(c => list.appendChild(renderComment(c)));
	}

	const textarea = section.querySelector('#comment-input');
	textarea?.addEventListener('input', () => {
		textarea.style.height = 'auto';
		textarea.style.height = textarea.scrollHeight + 'px';
	});

	section.querySelector('#comment-submit')?.addEventListener('click', async () => {
		const text = textarea.value.trim();
		if (!text) return;
		const btn = section.querySelector('#comment-submit');
		btn.disabled = true; btn.textContent = '...';
		try {
			const comment = await addComment(trackId, text);
			textarea.value = ''; textarea.style.height = 'auto';
			list.querySelector('.comments-empty')?.remove();
			list.appendChild(renderComment(comment));
			list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
		} catch (err) { showToast('Ошибка: ' + err.message, 'error'); }
		finally { btn.disabled = false; btn.textContent = 'Отправить'; }
	});

	textarea?.addEventListener('keydown', e => {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); section.querySelector('#comment-submit').click(); }
	});

	section.querySelector('#comment-login-btn')?.addEventListener('click', () => {
		document.getElementById('auth-modal').classList.add('open');
	});

	return section;
}