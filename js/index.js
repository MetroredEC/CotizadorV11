// index.js
// Inicializa la página principal según el rol y la sesión almacenada.

const ROLE_SECTIONS = {
  auditor: ['dashboard', 'audit'],
  controller: ['dashboard', 'audit', 'medicos'],
  admin: ['admin'],
};

/**
 * Devuelve el listado de secciones permitidas para un rol.
 * @param {string} role
 * @returns {string[]}
 */
function getSectionsForRole(role) {
  return ROLE_SECTIONS[role] || ['dashboard'];
}

/**
 * Aplica la visibilidad de tabs y secciones según el rol.
 * @param {string} role
 */
function applyRoleAccess(role) {
  const allowedSections = getSectionsForRole(role);
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    const section = tab.dataset.section;
    const allowed = allowedSections.includes(section);
    tab.style.display = allowed ? 'inline-block' : 'none';
  });

  const sections = document.querySelectorAll('.panel-section');
  sections.forEach((sectionEl) => {
    const allowed = allowedSections.includes(sectionEl.id);
    sectionEl.style.display = allowed ? 'block' : 'none';
  });

  const hashSection = window.location.hash.replace('#', '') || allowedSections[0];
  const targetSection = allowedSections.includes(hashSection) ? hashSection : allowedSections[0];
  showSection(targetSection);
}

/**
 * Marca un tab como activo y muestra solo su sección asociada.
 * @param {string} sectionId
 */
function showSection(sectionId) {
  const sections = document.querySelectorAll('.panel-section');
  sections.forEach((section) => {
    section.style.display = section.id === sectionId ? 'block' : 'none';
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    const isActive = tab.dataset.section === sectionId;
    tab.classList.toggle('active', isActive);
  });

  if (window.location.hash !== `#${sectionId}`) {
    window.location.hash = sectionId;
  }
}

/**
 * Completa la cabecera con el usuario autenticado.
 * @param {Object} user
 */
function populateHeader(user) {
  const nameEl = document.getElementById('userFullName');
  const roleEl = document.getElementById('userRole');
  const sessionStatus = document.getElementById('sessionStatus');
  const roleSelect = document.getElementById('roleSelect');

  nameEl.textContent = user.fullName || user.username;
  roleEl.textContent = user.role;
  sessionStatus.textContent = 'Sesión activa';

  const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
  roleSelect.innerHTML = '';
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    roleSelect.appendChild(option);
  });
  roleSelect.value = user.role;
  roleSelect.disabled = roles.length === 1;

  roleSelect.addEventListener('change', (event) => {
    const newRole = event.target.value;
    updateCurrentUserRole(newRole);
    roleEl.textContent = newRole;
    applyRoleAccess(newRole);
  });
}

function initNavigation() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      showSection(tab.dataset.section);
    });
  });

  window.addEventListener('hashchange', () => {
    const currentUser = getCurrentUser();
    const allowedSections = currentUser ? getSectionsForRole(currentUser.role) : [];
    const requested = window.location.hash.replace('#', '');
    if (allowedSections.includes(requested)) {
      showSection(requested);
    } else if (allowedSections.length) {
      showSection(allowedSections[0]);
    }
  });
}

function initPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  populateHeader(currentUser);
  applyRoleAccess(currentUser.role);
  initNavigation();

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', initPage);
