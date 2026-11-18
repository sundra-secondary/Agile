(() => {
  const userCookie = 'epharmacist.user';

  window.showAlert = (type, message) => {
    document.querySelector('[data-flash-alert]')?.remove();
    const alert = document.createElement('div');
    alert.dataset.flashAlert = '';
    alert.className = `alert ${type === 'success' ? 'alert-success' : ''}`;
    alert.setAttribute('role', type === 'success' ? 'status' : 'alert');
    alert.textContent = message;
    const host = document.querySelector('.form-inner, .dashboard-card, .profile-heading') || document.querySelector('main');
    host.prepend(alert);
    return alert;
  };

  window.storeDisplayUser = user => {
    const profile = { id: user.id, firstName: user.firstName, role: user.role };
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${userCookie}=${encodeURIComponent(JSON.stringify(profile))}; Path=/; Max-Age=7776000; SameSite=Lax${secure}`;
  };

  window.readDisplayUser = () => {
    const item = document.cookie.split('; ').find(part => part.startsWith(`${userCookie}=`));
    if (!item) return null;
    try { return JSON.parse(decodeURIComponent(item.slice(userCookie.length + 1))); }
    catch { return null; }
  };

  window.clearDisplayUser = () => {
    document.cookie = `${userCookie}=; Path=/; Max-Age=0; SameSite=Lax`;
  };
})();
