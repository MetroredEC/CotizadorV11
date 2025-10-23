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
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCIRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAABJKGAAcAAAAvAAAAUKABAAMAAAABAAEAAKACAAQAAAABAAACAKADAAQAAAABAAACAAAAAABBU0NJSQAAADEuOTAuNS1UTlVFR0o1VFNVVlZWS1Q1SkYzUVZENUJLVS4wLjEtMQD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgCAAIAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYX';

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
