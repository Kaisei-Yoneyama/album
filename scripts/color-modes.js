'use strict';

addEventListener('load', (event) => {
  const mediaQueryList = matchMedia('(prefers-color-scheme: dark)');

  mediaQueryList.addEventListener('change', (event) => {
    document.documentElement.dataset.bsTheme = event.matches ? 'dark' : 'light';
  });

  if (mediaQueryList.matches) {
    document.documentElement.dataset.bsTheme = 'dark';
  }
});
