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
  <rect width="64" height="64" rx="14" fill="#d3222a" />
  <path
    d="M16 48V16h7.5l8.5 15 8.5-15H48v32h-7.5V33.5L32 48l-8.5-14.5V48Z"
    fill="#ffffff"
  />
</svg>
`.trim();

const METRORED_FAVICON_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(METRORED_FAVICON_SVG);

window.METRORED_ASSETS = Object.freeze({
  logo: METRORED_LOGO_DATA_URL,
  favicon: METRORED_FAVICON_DATA_URL,
});
