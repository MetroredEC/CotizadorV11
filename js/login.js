// login.js
// Maneja el formulario de inicio de sesión en login.html

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorElem = document.getElementById('loginError');

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    errorElem.textContent = '';

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;
    const user = authenticate(username, password);

    if (user) {
      setCurrentUser(user);
      window.location.href = 'index.html';
    } else {
      errorElem.textContent = 'Usuario o contraseña incorrectos. Por favor, verifica los datos.';
    }
  });
});
