const signupForm = document.querySelector('form[data-validate]');
if (signupForm) {
  signupForm.addEventListener('submit', event => {
    const password = signupForm.elements.password.value;
    const confirmation = signupForm.elements.confirmPassword.value;
    const error = document.querySelector('[data-password-error]');
    const mismatch = password !== confirmation;
    error.hidden = !mismatch;
    signupForm.elements.confirmPassword.setCustomValidity(mismatch ? 'Passwords do not match.' : '');
    if (mismatch) {
      event.preventDefault();
      signupForm.elements.confirmPassword.reportValidity();
    }
  });
  signupForm.elements.confirmPassword.addEventListener('input', () => {
    signupForm.elements.confirmPassword.setCustomValidity('');
    document.querySelector('[data-password-error]').hidden = true;
  });
}
