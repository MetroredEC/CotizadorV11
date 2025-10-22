// Vector-based assets encoded as data URIs to avoid storing binary files in the repository.
const METRORED_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="140" viewBox="0 0 360 140">
  <defs>
    <linearGradient id="metroredGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00a7e1" />
      <stop offset="100%" stop-color="#0092d0" />
    </linearGradient>
  </defs>
  <rect width="360" height="140" rx="16" fill="url(#metroredGradient)" />
  <text
    x="180"
    y="72"
    text-anchor="middle"
    font-family="'Montserrat', 'Arial Black', 'Helvetica Neue', sans-serif"
    font-size="60"
    font-weight="700"
    letter-spacing="4"
    fill="#ffffff"
  >METRORED</text>
  <line x1="36" y1="96" x2="324" y2="96" stroke="#111111" stroke-width="6" stroke-linecap="round" />
  <text
    x="180"
    y="122"
    text-anchor="middle"
    font-family="'Montserrat', 'Arial', 'Helvetica Neue', sans-serif"
    font-size="28"
    font-weight="600"
    letter-spacing="8"
    fill="#0f1b2b"
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
