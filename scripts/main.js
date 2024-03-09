'use strict';

dayjs.locale('ja');
dayjs.extend(dayjs_plugin_utc);
dayjs.extend(dayjs_plugin_timezone);
dayjs.extend(dayjs_plugin_relativeTime);
dayjs.tz.setDefault('Asia/Tokyo');

const album = document.querySelector('#album');
const form = document.querySelector('form');

const DATABASE_VERSION = 1;
const DATABASE_NAME = 'album';
const STORE_NAME = 'entries';

/** @type {IDBDatabase} */
let database;

/**
 * @typedef {object} Entry - エントリー
 * @property {number} [id] - キー
 * @property {File[]} photos - フォト
 * @property {string} caption - キャプション
 * @property {Date} timestamp - タイムスタンプ
 */

addEventListener('load', () => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.addEventListener('upgradeneeded', (event) => {
    const database = event.target.result;
    database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
  });

  request.addEventListener('success', (event) => {
    database = event.target.result;

    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor(null, 'next');

    request.addEventListener('success', (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const column = Column({ entry: cursor.value });
        album.prepend(column);
        cursor.continue();
      }
    });
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  /** @type {Entry} */
  const entry = {
    photos: formData.getAll('photos'),
    caption: formData.get('caption'),
    timestamp: new Date()
  };

  // アルバムに追加する
  addEntry(entry);

  form.reset();
});

/**
 * エントリーをデータベースに保存する
 * @param {Entry} entry - エントリー
 */
function addEntry(entry) {
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.add(entry);

  request.addEventListener('success', (event) => {
    const key = event.target.result;
    entry.id = key;
  });

  transaction.addEventListener('complete', () => {
    const column = Column({ entry });
    album.prepend(column);
  });

  transaction.addEventListener('abort', (event) => {
    if (event.target.error.name === 'QuotaExceededError') {
      alert('データベースの空き容量がないため、エントリーを保存できませんでした。');
    }
  });
}

/**
 * エントリーをデータベースとページから削除する
 * @param {string} primaryKey - 主キー
 */
function deleteEntry(primaryKey) {
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(parseInt(primaryKey));

  transaction.addEventListener('complete', () => {
    const column = document.querySelector(`[data-key="${primaryKey}"]`);
    column.remove();
  });
}

function Column(props) {
  const column = html`
    <div class="col" data-key="${props.entry.id}">
      <div class="card">
        ${props.entry.photos.length > 1
          ? Carousel({ photos: props.entry.photos })
          : CardImage({ photo: props.entry.photos[0] })}
        <div class="card-body">
          <p class="card-text">${props.entry.caption}</p>
          <div class="d-flex justify-content-between align-items-center">
            ${TimestampTooltip({ time: props.entry.timestamp })}
            ${DeleteButton({ id: props.entry.id })}
          </div>
        </div>
      </div>
    </div>
  `;

  return column;
}

function Carousel(props) {
  const carouselItems = props.photos.map((photo, index) => {
    const image = CardImage({ photo, className: 'd-block w-100' });
    const carouselItem = html`<div class="${index ? 'carousel-item' : 'carousel-item active'}" data-bs-interval="${props.interval || 3000}">${image}</div>`;
    return carouselItem;
  });

  const identifier = `carousel-${crypto.randomUUID()}`;

  const carousel = html`
    <div id="${identifier}" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">${carouselItems}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#${identifier}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${identifier}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>
  `;

  return carousel;
}

function CardImage(props) {
  const image = html`<img src="${URL.createObjectURL(props.photo)}" class="${props.className || 'card-img-top'}" alt="${props.photo.name}">`;

  image.addEventListener('load', (event) => {
    // 画像が読み込まれたらオブジェクト URL を解放する
    URL.revokeObjectURL(event.currentTarget.src);
  });

  return image;
}

function TimestampTooltip(props) {
  const relativeTime = dayjs(props.time).tz().fromNow();
  const absoluteTime = dayjs(props.time).tz().format('YYYY年MM月DD日 HH時mm分ss秒');

  const tooltip = html`<small style="cursor: default;" class="text-muted" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<small>${absoluteTime}</small>">${relativeTime}</small>`;
  new bootstrap.Tooltip(tooltip);

  return tooltip;
}

function DeleteButton(props) {
  const button = html`<button type="button" class="btn btn-sm btn-outline-danger" data-primary-key="${props.id}"><i class="bi bi-trash"></i></button>`;

  button.addEventListener('click', (event) => {
    deleteEntry(event.currentTarget.dataset.primaryKey);
  });

  return button;
}
