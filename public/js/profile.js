(() => {
  const details = document.querySelector('[data-profile-form]');
  const passwordForm = document.querySelector('[data-password-form]');
  if (!details || !passwordForm || !window.axios) return;

  details.addEventListener('submit', async event => {
    event.preventDefault();
    const button = details.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await axios.patch('/api/v1/users/updateMe', new FormData(details));
      const user = response.data.user;
      window.storeDisplayUser?.(user);
      const photo = document.querySelector('[data-profile-photo]');
      if (user.photo && photo) {
        const image = document.createElement('img');
        image.className = 'profile-photo';
        image.dataset.profilePhoto = '';
        image.src = user.photo;
        image.alt = 'Profile photo';
        photo.replaceWith(image);
      }
      window.showAlert('success', 'Account details updated.');
    } catch (error) {
      window.showAlert('error', error.response?.data?.error || error.message || 'Unable to update your account.');
    } finally { button.disabled = false; }
  });

  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = passwordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await axios.patch('/api/v1/users/updateMyPassword', {
        passwordCurrent: passwordForm.elements.passwordCurrent.value,
        password: passwordForm.elements.password.value,
        passwordConfirm: passwordForm.elements.passwordConfirm.value
      });
      passwordForm.reset();
      window.showAlert('success', 'Password updated.');
    } catch (error) {
      window.showAlert('error', error.response?.data?.error || error.message || 'Unable to update your password.');
    } finally { button.disabled = false; }
  });
})();
