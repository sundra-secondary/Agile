(() => {
  const form = document.querySelector('[data-login-form]');
  if (!form || !window.axios) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      const response = await axios.post('/api/v1/users/login', { email, password });
      window.storeDisplayUser(response.data.user);
      window.showAlert('success', 'Signed in successfully. Opening your dashboard…');
      window.setTimeout(() => { location.assign('/dashboard'); }, 900);
    } catch (error) {
      window.showAlert('error', error.response?.data?.error || error.message || 'Unable to sign in.');
      button.disabled = false;
    }
  });
})();
