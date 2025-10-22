// Vector-based assets encoded as data URIs to avoid storing binary files in the repository.
const METRORED_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200">
  <style>
    .wordmark {
      font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 700;
      font-size: 120px;
      letter-spacing: 1px;
      fill: #00a0df;
    }
    .tagline {
      font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 500;
      font-size: 48px;
      letter-spacing: 3px;
      fill: #00a0df;
    }
  </style>
  <text class="wordmark" x="0" y="120">Metrored</text>
  <text class="tagline" x="4" y="178">Centros Médicos</text>
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
