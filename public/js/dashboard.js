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

  const feed = document.querySelector('[data-news-feed]');
  const status = document.querySelector('[data-news-status]');
  if (feed && status && window.axios) {
    axios.get('/api/v1/newsFeeds').then(response => {
      const items = response.data.data.news;
      status.textContent = items.length ? '' : 'No news has been published yet.';
      const template = document.querySelector('#news-card-template');
      for (const item of items) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('[data-news-image]').src = item.imageCover;
        card.querySelector('[data-news-title]').textContent = item.title;
        card.querySelector('[data-news-description]').textContent = item.description;
        card.querySelector('[data-news-content]').textContent = item.content;
        card.querySelector('[data-news-author]').textContent = item.publishedBy;
        const date = card.querySelector('[data-news-date]');
        if (item.publishedAt) {
          date.dateTime = item.publishedAt;
          date.textContent = new Date(item.publishedAt).toLocaleDateString();
        }
        feed.append(card);
      }
    }).catch(() => { status.textContent = 'News is temporarily unavailable.'; });
  } else if (status) {
    status.textContent = 'News is temporarily unavailable.';
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
