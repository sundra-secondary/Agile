const User = require('../models/userModel');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signupPage(req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  return res.render('signup', { title: 'Create an account', error: null, values: {} });
}

async function signup(req, res) {
  const values = {
    firstName: String(req.body.firstName || '').trim(),
    lastName: String(req.body.lastName || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    role: String(req.body.role || '')
  };
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const fail = (error, status = 400) => res.status(status).render('signup', { title: 'Create an account', error, values });

  if (!values.firstName || !values.lastName || !values.email || !password || !confirmPassword || !values.role) return fail('Please complete every field.');
  if (values.firstName.length > 60 || values.lastName.length > 60) return fail('Names must be 60 characters or fewer.');
  if (!emailPattern.test(values.email)) return fail('Enter a valid email address.');
  if (!['patient', 'caregiver'].includes(values.role)) return fail('Choose patient or caregiver.');
  if (password.length < 8) return fail('Use a password with at least 8 characters.');
  if (password !== confirmPassword) return fail('Passwords do not match.');

  try {
    const user = await User.create({ ...values, password });
    req.session.regenerate(error => {
      if (error) return fail('Unable to start your session. Please sign in.', 500);
      req.session.user = { id: user.id, firstName: user.firstName, role: user.role };
      return res.redirect('/dashboard');
    });
  } catch (error) {
    if (error.code === 11000) return fail('An account with that email already exists.', 409);
    if (error.name === 'ValidationError') return fail(Object.values(error.errors)[0].message);
    return fail('Unable to create the account right now. Please try again.', 500);
  }
}

function loginPage(req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  return res.render('login', { title: 'Sign in', error: null, email: '' });
}

async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const fail = (error, status = 401) => res.status(status).render('login', { title: 'Sign in', error, email });
  if (!email || !password) return fail('Enter your email and password.', 400);
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.verifyPassword(password))) return fail('Incorrect email or password.');
    req.session.regenerate(error => {
      if (error) return fail('Unable to start your session. Please try again.', 500);
      req.session.user = { id: user.id, firstName: user.firstName, role: user.role };
      return res.redirect('/dashboard');
    });
  } catch (error) {
    return fail('Unable to sign in right now. Please try again.', 500);
  }
}

function dashboard(req, res) {
  if (!req.session.user) return res.redirect('/login');
  return res.render('dashboard', { title: 'Your account', user: req.session.user });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('epharmacist.sid');
    res.redirect('/login');
  });
}

module.exports = { signupPage, signup, loginPage, login, dashboard, logout };
