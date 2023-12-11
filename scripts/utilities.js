'use strict';

function element(strings, ...values) {
  const template = document.createElement('template');

  template.innerHTML = String.raw({ raw: strings }, ...values.map((value) => {
    return typeof value === 'string' ? escape(value) : value;
  }));

  return template.content.firstElementChild;
}

function escape(string) {
  return string
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;');
}
