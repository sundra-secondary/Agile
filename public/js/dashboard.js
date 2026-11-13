(() => {
  const page = document.querySelector('[data-dashboard]');
  if (!page) return;

  if (page.dataset.authenticated === 'true') {
    const user = { id: page.dataset.userId, firstName: page.dataset.firstName, role: page.dataset.role };
    const remembered = window.readDisplayUser?.();
    if (!remembered || remembered.id !== user.id || remembered.firstName !== user.firstName || remembered.role !== user.role) {
      window.storeDisplayUser?.(user);
    }
  } else {
    window.clearDisplayUser?.();
  }

  const form = document.querySelector('[data-logout]');
  if (!form || !window.axios) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await axios.post('/api/v1/users/logout');
      window.clearDisplayUser?.();
      window.showAlert('success', 'Signed out successfully.');
      window.setTimeout(() => { location.assign('/dashboard'); }, 900);
    } catch (error) {
      window.showAlert('error', error.response?.data?.error || error.message || 'Unable to sign out.');
      button.disabled = false;
    }
  });
})();
