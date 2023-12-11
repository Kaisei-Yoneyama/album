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
        <div class="card-body">
          <p class="card-text">${entry.caption}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small style="cursor: default;" class="text-muted" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<small>${dayjs(entry.timestamp).tz().format('YYYY年MM月DD日 HH時mm分ss秒')}</small>">${dayjs(entry.timestamp).tz().fromNow()}</small>
            <button type="button" class="btn btn-sm btn-outline-danger" data-primary-key="${entry.id}" onclick="deleteEntry(this.dataset.primaryKey);"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;

  // フォトが 2 枚以上ある場合はカルーセルで表示する
  if (entry.photos.length > 1) {
    const carousel = element`
      <div id="carousel-${entry.id}" class="carousel slide" data-bs-ride="carousel">
        <div class="carousel-inner"></div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${entry.id}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carousel-${entry.id}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
    `;
    const carouselItems = entry.photos.map((photo, index) => element`
      <div class="${index ? 'carousel-item' : 'carousel-item active'}" data-bs-interval="3000">
        <img src="${URL.createObjectURL(photo)}" onload="window.URL.revokeObjectURL(this.src);" class="d-block w-100" alt="${photo.name}">
      </div>
    `);
    carousel.firstElementChild.append(...carouselItems);
    column.firstElementChild.prepend(carousel);
  } else {
    const [ photo ] = entry.photos;
    const image = element`<img src="${URL.createObjectURL(photo)}" onload="window.URL.revokeObjectURL(this.src);" class="card-img-top" alt="${photo.name}">`;
    column.firstElementChild.prepend(image);
  }

  // ツールチップを初期化する
  const tooltip = column.querySelector('[data-bs-toggle="tooltip"]');
  new bootstrap.Tooltip(tooltip);

  album.prepend(column);
}
