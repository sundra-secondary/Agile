function signupPage(req, res) {
  if (req.user) return res.redirect('/dashboard');
  return res.render('signup', { title: 'Create an account', error: null, values: {} });
}

function loginPage(req, res) {
  if (req.user) return res.redirect('/dashboard');
  return res.render('login', { title: 'Sign in', error: null, email: '' });
}

function dashboard(req, res) {
  return res.render('dashboard', { title: 'Your account', user: req.user || null });
}

module.exports = { signupPage, loginPage, dashboard };
