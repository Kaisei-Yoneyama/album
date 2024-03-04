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
        displayEntry(cursor.value);
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
    displayEntry(entry);
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

/**
 * エントリーをアルバムに表示する
 * @param {Entry} entry - エントリー
 */
function displayEntry(entry) {
  const column = element`
    <div class="col" data-key="${entry.id}">
      <div class="card">
        ${entry.photos.length > 1 ? createCarousel(entry.id, entry.photos) : createImage(entry.photos[0])}
        <div class="card-body">
          <p class="card-text">${entry.caption}</p>
          <div class="d-flex justify-content-between align-items-center">
            ${createTooltip(entry.timestamp)}
            ${createDeleteButton(entry.id)}
          </div>
        </div>
      </div>
    </div>
  `;

  album.prepend(column);
}

function createCarousel(id, photos) {
  const carouselItems = photos.map((photo, index) => {
    const image = element`<img src="${URL.createObjectURL(photo)}" class="d-block w-100" alt="${photo.name}">`;
    image.addEventListener('load', event => URL.revokeObjectURL(event.currentTarget.src));

    const carouselItem = element`<div class="${index ? 'carousel-item' : 'carousel-item active'}" data-bs-interval="3000">${image}</div>`;
    return carouselItem;
  });

  const carousel = element`
    <div id="carousel-${id}" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">${carouselItems}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${id}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#carousel-${id}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>
  `;

  return carousel;
}

function createImage(photo) {
  const image = element`<img src="${URL.createObjectURL(photo)}" class="card-img-top" alt="${photo.name}">`;
  image.addEventListener('load', event => URL.revokeObjectURL(event.currentTarget.src));
  return image;
}

function createTooltip(timestamp) {
  const relativeTime = dayjs(timestamp).tz().fromNow();
  const absoluteTime = dayjs(timestamp).tz().format('YYYY年MM月DD日 HH時mm分ss秒');
  const tooltip = element`<small style="cursor: default;" class="text-muted" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<small>${absoluteTime}</small>">${relativeTime}</small>`;
  new bootstrap.Tooltip(tooltip);
  return tooltip;
}

function createDeleteButton(id) {
  const button = element`<button type="button" class="btn btn-sm btn-outline-danger" data-primary-key="${id}"><i class="bi bi-trash"></i></button>`;
  button.addEventListener('click', event => deleteEntry(event.currentTarget.dataset.primaryKey));
  return button;
}
