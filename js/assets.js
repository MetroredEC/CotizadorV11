// Vector-based assets encoded as data URIs to avoid storing binary files in the repository.
const METRORED_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">
  <rect width="320" height="120" rx="18" fill="#ffffff" />
  <rect x="0" y="0" width="128" height="120" rx="20" fill="#d3222a" />
  <path
    d="M40 88V32h18l22 38 22-38h18v56h-18V67.5L80 102 58 67.5V88Z"
    fill="#ffffff"
  />
  <text
    x="152"
    y="66"
    font-family="'Montserrat', 'Arial Black', sans-serif"
    font-size="42"
    font-weight="700"
    fill="#323232"
  >METRORED</text>
  <text
    x="152"
    y="98"
    font-family="'Montserrat', 'Arial', sans-serif"
    font-size="26"
    font-weight="500"
    fill="#d3222a"
  >SALUD</text>
</svg>
`.trim();

const METRORED_LOGO_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(METRORED_LOGO_SVG);

const METRORED_FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#05a4eb" />
  <path
    d="M18 48V18l6.5 0 7.5 14 7.5-14H46v30h-6.5V33l-9 15-9-15v15Z"
    fill="#101820"
  />
  <path
    d="M39.5 18h6.5v8.5"
    stroke="#d3222a"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
</svg>
`.trim();

const METRORED_FAVICON_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(METRORED_FAVICON_SVG);

window.METRORED_ASSETS = Object.freeze({
  logo: METRORED_LOGO_DATA_URL,
  favicon: METRORED_FAVICON_DATA_URL,
});
