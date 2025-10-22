// Inline Metrored assets encoded as data URIs to avoid storing binary files in the repository.
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

const METRORED_FAVICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA10lEQVR42u3aPQ7CMAwG0O4sjIyIkYNyL87AgWBHpaDG+cNv+LZKtp6iNnG6HG73Z+YsAAAAAAAAAAAAAAA'
  + 'A2JXj6dw0j8v1awAAAAAAAAAAAP4SYC2pdoIARgSoDVRSvztAKUJEfQAAGrwEewAM9RUAkB1gq5EaAENuhKJXQURdAAAanwVaAAx9GAKQHeBTQ1EAU8wDIlZBRD0AADqOxGoATDUTBJAdYK2xEoApx+J7V0FEHQAABrkZigCY+moMQHaA9wZrP+9PUQAAAAAAAAAAAAAAfsoLmPgR6cgZJvsAAAAASUVORK5CYII=';

function readLocalAssetOverride(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

const storedLogo = readLocalAssetOverride('metroredLogoOverride');
const storedFavicon = readLocalAssetOverride('metroredFaviconOverride');

window.METRORED_ASSETS = {
  logo: storedLogo || METRORED_LOGO_DATA_URL,
  favicon: storedFavicon || METRORED_FAVICON_DATA_URL,
  defaults: {
    logo: METRORED_LOGO_DATA_URL,
    favicon: METRORED_FAVICON_DATA_URL,
  },
  overrides: {
    logo: storedLogo,
    favicon: storedFavicon,
  },
};
