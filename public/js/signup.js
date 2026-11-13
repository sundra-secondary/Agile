(() => {
  const form = document.querySelector('[data-signup-form]');
  if (!form || !window.axios) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.checkValidity()) return;
    const password = form.elements.password.value;
    const passwordConfirm = form.elements.confirmPassword.value;
    if (password !== passwordConfirm) {
      form.elements.confirmPassword.setCustomValidity('Passwords do not match.');
      form.elements.confirmPassword.reportValidity();
      window.showAlert('error', 'Passwords do not match.');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await axios.post('/api/v1/users/signup', {
        firstName: form.elements.firstName.value.trim(),
        lastName: form.elements.lastName.value.trim(),
        email: form.elements.email.value.trim(),
        role: form.querySelector('input[name="role"]:checked')?.value || '',
        password, passwordConfirm
      });
      window.storeDisplayUser(response.data.user);
      window.showAlert('success', 'Account created. Opening your dashboard…');
      window.setTimeout(() => { location.assign('/dashboard'); }, 900);
    } catch (error) {
      window.showAlert('error', error.response?.data?.error || error.message || 'Unable to create your account.');
      button.disabled = false;
    }
  });
})();
