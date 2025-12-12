// auth.js
// Gestión básica de autenticación y sesión en el frontend.

const USERS = [
  {
    username: 'Administrador',
    password: 'Metrored2025',
    prefix: '',
    firstName: 'Administrador',
    lastName: '',
    roles: ['admin'],
  },
  {
    username: 'mvargas',
    password: 'Metrored2025',
    prefix: 'Lic.',
    firstName: 'María',
    lastName: 'Vargas',
    roles: ['auditor'],
  },
  {
    username: 'nnavarrete',
    password: 'Metrored2025',
    prefix: 'Dr.',
    firstName: 'Nicolás',
    lastName: 'Navarrete',
    roles: ['controller'],
  },
];

const CURRENT_USER_KEY = 'currentUser';

/**
 * Construye el nombre completo a partir de prefijo, nombre y apellido.
 * @param {Object} user
 * @returns {string}
 */
function buildFullName(user) {
  const parts = [];
  if (user.prefix) parts.push(user.prefix.trim());
  if (user.firstName) parts.push(user.firstName.trim());
  if (user.lastName) parts.push(user.lastName.trim());
  return parts.join(' ').trim();
}

/**
 * Valida las credenciales contra el arreglo USERS.
 * @param {string} username
 * @param {string} password
 * @returns {Object|null} Datos del usuario autenticado o null si falló.
 */
function authenticate(username, password) {
  const user = USERS.find(
    (candidate) => candidate.username === username && candidate.password === password,
  );
  if (!user) return null;

  const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ['auditor'];
  return {
    username: user.username,
    fullName: buildFullName(user),
    role: roles[0],
    roles,
  };
}

/**
 * Guarda el usuario actual en localStorage (sin password).
 * @param {Object} user
 */
function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

/**
 * Devuelve el usuario autenticado almacenado o null si no existe.
 * @returns {Object|null}
 */
function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

/**
 * Actualiza el rol activo del usuario y lo persiste.
 * @param {string} role
 */
function updateCurrentUserRole(role) {
  const user = getCurrentUser();
  if (!user) return;
  user.role = role;
  setCurrentUser(user);
}

/**
 * Elimina la sesión guardada.
 */
function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Termina la sesión y regresa al login.
 */
function logout() {
  clearCurrentUser();
  window.location.href = 'login.html';
}

// Exponer funciones globales
window.authenticate = authenticate;
window.setCurrentUser = setCurrentUser;
window.getCurrentUser = getCurrentUser;
window.updateCurrentUserRole = updateCurrentUserRole;
window.logout = logout;
window.clearCurrentUser = clearCurrentUser;
window.USERS = USERS;
