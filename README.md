# Rateform

Платформа для оценки музыкальных треков. Артисты загружают свои работы, слушатели оценивают их по детальным критериям.

---

## Версии

### v1.0.0 — Базовая версия
- Авторизация через Email/Password и Google
- Загрузка треков (аудио + обложка) через Firebase Storage
- Оценивание треков по 5 критериям
- Лента треков, страница топа, профиль пользователя
- Роутер на hash-навигации

---

### v1.1.0 — Исправление критических ошибок
- Создан `js/utils.js` — общие утилиты `showToast()` и `formatTime()` (файл отсутствовал, все импорты падали)
- `RatingWidget.js` — исправлен импорт `showToast` (циклическая зависимость), исправлены неверные ключи критериев, добавлен `onRated` callback
- `FeedView.js` — исправлен экспорт `renderFeedView → FeedView` (лента не рендерилась)
- `store.js` — `rateTrack()` и `_recalcTrack()` теперь возвращают `{ averageRating, totalRatings, ratingBreakdown }`
- `app.js` — убран циклический импорт `showToast`
- `index.html` — удалено дублирование тегов `<script>`

---

### v1.2.0 — Загрузка файлов, адаптив, профиль, дизайн
- **Загрузка файлов** — `store.js`: `ref` переименован в `storageRef`, улучшены сообщения об ошибках
- **Адаптив** — полный мобильный адаптив для всех компонентов (шапка, лента, трек, загрузка, профиль, топ)
- **Профиль** — клик по аватару в шапке ведёт на профиль, отдельная кнопка выхода
- **Дизайн ленты** — `components.css` полностью переписан, добавлены все недостающие классы

---

### v1.3.0 — Переход на Cloudinary
- Firebase Storage заменён на **Cloudinary** (загрузка без банковской карты)
- `store.js` — загрузка через `XMLHttpRequest` с реальным прогрессом
- Аудио загружается как `resource_type=video` (требование Cloudinary для MP3/WAV)
- `firebase-config.js` — убран импорт Firebase Storage

---

### v1.4.0 — Новые функции пользователя
- **Изменение никнейма** — обновляется в Auth, Firestore и во всех треках автора
- **Изменение аватара** — загружается на Cloudinary
- **Фиты** — поле при загрузке, отображается как `feat. Имя1, Имя2`
- **Редактирование трека** — название, фиты, обложка прямо на странице трека
- **Оценки только чужих треков** — блокировка на уровне клиента и Firestore Rules
- **Удаление треков** — только своих, чистит все оценки трека, обновляет счётчик

---

### v1.5.0 — Дизайн и глобальный плеер
- **Минималистичный дизайн** — переработаны кнопки, отступы, border-radius, убраны тени
- **Глобальный плеер** (`js/player.js`) — фиксирован снизу, работает на любой странице
- **Кнопка play на карточке** — запускает трек в глобальном плеере без перехода на страницу
- **Кастомный жанр** — пункт «Другой (написать)» с текстовым полем
- **Редактирование аудио** — автор может заменить аудиофайл и жанр трека
- **Firestore Rules** — добавлены правила для удаления оценок при удалении трека

---

### v1.6.0 — Комментарии, лайки, поиск, уведомления
- **Комментарии** — секция под треком, аватары, время «5 мин назад», Enter для отправки, удаление своих
- **Лайки** — кнопка ♡ с optimistic UI, без полной оценки
- **Поиск** (`SearchView.js`) — страница `/search`, debounce 350ms, поиск по названию / автору / жанру / фитам
- **Уведомления** — кнопка 🔔 в шапке, real-time badge, панель с историей; приходят при оценке и комментарии
- **Waveform** — canvas-анимация вместо статичного прогресс-бара (Web Audio API + fallback)
- **Blur-фон** — размытая обложка как фон страницы трека
- **Жанр-бейдж** — цветная метка жанра (каждый жанр свой цвет)
- Firestore Rules расширены: коллекции `likes`, `comments`, `notifications`

---

### v1.7.0 — SVG иконки и новые критерии
- **SVG иконки** (`js/icons.js`) — все эмодзи заменены на Feather-style SVG иконки
- **Новые критерии оценивания:**
  - `voice` — Голос и подача
  - `lyrics` — Текст и смысл
  - `music` — Музыка (бит/минус)
  - `blend` — Сочетание (целостность трека)
  - `repeat` — Репит-фактор
- **Тултипы** — иконка `ⓘ` рядом с каждым критерием раскрывает описание при наведении
- **Спиннер** в кнопке сохранения оценки

---

### v1.8.0 — Текст песни
- **Загрузка** — поле «Текст песни» в форме загрузки трека (необязательное)
- **Просмотр** — блок «Текст песни» на странице трека раскрывается по кнопке, свёрнут по умолчанию
- **Редактирование** — автор может добавить или изменить текст через форму редактирования (✏️)
- **Добавление позже** — кнопка «Добавить текст» если текст не был добавлен при загрузке
- Форматирование сохраняется (переносы строк, куплеты)

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Vanilla JS (ES Modules), без фреймворков |
| Роутинг | Hash-роутер (`#feed`, `#track/:id`, `#profile/:uid`) |
| База данных | Firebase Firestore |
| Авторизация | Firebase Auth (Email + Google) |
| Хранилище файлов | Cloudinary (аудио, обложки, аватары) |
| Стили | CSS Custom Properties, без препроцессоров |

---

## Структура проекта

```
Evaluation-app/
├── index.html
├── style/
│   ├── style.css          # Глобальные стили, переменные, шапка, кнопки
│   └── components.css     # Компонентные стили
└── js/
    ├── app.js             # Инициализация, авторизация, уведомления
    ├── firebase-config.js # Firebase конфиг
    ├── store.js           # Вся бизнес-логика и работа с Firestore
    ├── router.js          # Hash-роутер
    ├── player.js          # Глобальный аудиоплеер
    ├── icons.js           # SVG иконки
    ├── utils.js           # showToast, formatTime
    ├── components/
    │   ├── TrackCard.js   # Карточка трека в ленте
    │   ├── RatingWidget.js# Виджет оценивания
    │   └── Comments.js    # Секция комментариев
    └── views/
        ├── FeedView.js    # Лента треков
        ├── TrackView.js   # Страница трека
        ├── UploadView.js  # Загрузка трека
        ├── TopView.js     # Топ треков
        ├── ProfileView.js # Профиль пользователя
        └── SearchView.js  # Поиск
```

---

## Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /tracks/{trackId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null
        && request.auth.uid == resource.data.uploadedBy;
    }

    match /ratings/{ratingId} {
      allow read: if true;
      allow create, update: if request.auth != null
        && ratingId.matches(request.auth.uid + '_.*');
      allow delete: if request.auth != null
        && (
          ratingId.matches(request.auth.uid + '_.*')
          ||
          get(/databases/$(database)/documents/tracks/$(resource.data.trackId)).data.uploadedBy == request.auth.uid
        );
    }

    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId;
    }

    match /likes/{likeId} {
      allow read: if true;
      allow write: if request.auth != null
        && likeId.matches(request.auth.uid + '_.*');
    }

    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    match /notifications/{notifId} {
      allow read, update: if request.auth != null
        && resource.data.toUid == request.auth.uid;
      allow create: if request.auth != null;
    }

  }
}
```