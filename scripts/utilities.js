/**
 * HTML 文字列を基に HTML 要素を生成するタグ関数  
 * トップレベルの要素は 1 つまでとする
 * 
 * 埋め込み式の処理は下記のとおり
 * 
 * - `string` - サニタイズして埋め込む
 * - `boolean | Nullish` - 空文字列を埋め込む
 * - `Element | Element[]` - 参照を保持して埋め込む
 * - 上記以外 - そのまま埋め込む
 * 
 * @example
 * const heading = html`<h1>Hello, World!</h1>`;
 * document.body.appendChild(heading);
 * 
 * @throws {Error} - トップレベルの要素が 2 つ以上の場合
 * @throws {TypeError} - テンプレートリテラルの構文が不正な場合
 * @param {TemplateStringsArray} strings - HTML 文字列
 * @param {...any} substitutions - 埋め込み式
 * @returns {?Element} - HTML 要素
 */
function html(strings, ...substitutions) {
  const template = document.createElement('template');
  const slots = [];

  template.innerHTML = String.raw(
    { raw: strings },
    ...substitutions.map((substitution) => {
      if (
        isElement(substitution) ||
        isElementArray(substitution)
      ) {
        const slot = {
          name: `slot-${slots.length + 1}`,
          value: substitution
        };
        slots.push(slot);
        return `<span id="${slot.name}"></span>`;
      }

      if (
        isBoolean(substitution) ||
        isNullish(substitution)
      ) {
        // インラインの条件付きレンダーを再現するため
        // nullish や boolean の場合は空文字列を挿入する
        return '';
      }

      return isString(substitution) ?
        sanitize(substitution) :
        substitution;
    })
  );

  for (const { name, value } of slots) {
    const slot = template.content.getElementById(name);
    slot.replaceWith(...[].concat(value));
  }

  if (template.content.childElementCount > 1) {
    throw new Error(
      `トップレベルに ${template.content.childElementCount} 個の要素があります。\n` +
      'トップレベルの要素は 1 個までにする必要があります。\n' +
      template.innerHTML
    );
  }

  return template.content.firstElementChild;
}

function isElement(value) {
  return value instanceof Element;
}

function isElementArray(value) {
  return Array.isArray(value) && Boolean(value.length) && value.every(isElement);
}

function isNullish(value) {
  return value === null || value === undefined;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isString(value) {
  return typeof value === 'string';
}

function sanitize(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Nullish value
 * @typedef {null | undefined} Nullish
 */
