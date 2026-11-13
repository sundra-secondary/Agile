const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieName = 'epharmacist.jwt';

function publicUser(user) {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
}

function issueToken(user, res) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
  const days = Number(process.env.JWT_COOKIE_EXPIRES_IN) || 90;
  res.cookie(cookieName, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: days * 24 * 60 * 60 * 1000
  });
  return token;
}

function signupFields(body) {
  const fields = {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    role: String(body.role || ''),
    password: String(body.password || ''),
    passwordConfirm: String(body.passwordConfirm || body.confirmPassword || '')
  };
  if (Object.values(fields).some(value => !value)) throw new AppError('Please complete every field.', 400);
  if (fields.firstName.length > 60 || fields.lastName.length > 60) throw new AppError('Names must be 60 characters or fewer.', 400);
  if (!emailPattern.test(fields.email)) throw new AppError('Enter a valid email address.', 400);
  if (!['patient', 'caregiver'].includes(fields.role)) throw new AppError('Choose patient or caregiver.', 400);
  if (fields.password.length < 8) throw new AppError('Use a password with at least 8 characters.', 400);
  if (fields.password !== fields.passwordConfirm) throw new AppError('Passwords do not match.', 400);
  return fields;
}

async function createAccount(body) { return User.create(signupFields(body)); }

async function checkCredentials(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) throw new AppError('Enter your email and password.', 400);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.verifyPassword(password))) throw new AppError('Incorrect email or password.', 401);
  return user;
}

function tokenFrom(req) {
  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  return cookie ? cookie.slice(cookieName.length + 1) : null;
}

async function readToken(req, res, next) {
  const token = tokenFrom(req);
  if (!token) return next();
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return next(); }
  try { req.user = await User.findById(payload.id); return next(); }
  catch (error) { return next(error); }
}

function protectApi(req, res, next) {
  readToken(req, res, error => {
    if (error) return next(error);
    if (!req.user) return next(new AppError('Sign in to access this resource.', 401));
    return next();
  });
}

function protectPage(req, res, next) {
  readToken(req, res, error => {
    if (error) return next(error);
    if (!req.user) return res.redirect('/login');
    return next();
  });
}

async function apiSignup(req, res, next) {
  try {
    const user = await createAccount(req.body || {});
    return res.status(201).json({ token: issueToken(user, res), user: publicUser(user) });
  } catch (error) { return next(error); }
}

async function apiLogin(req, res, next) {
  try {
    const user = await checkCredentials(req.body || {});
    return res.json({ token: issueToken(user, res), user: publicUser(user) });
  } catch (error) { return next(error); }
}

async function formSignup(req, res) {
  const values = { firstName: req.body.firstName || '', lastName: req.body.lastName || '', email: req.body.email || '', role: req.body.role || '' };
  try {
    const user = await createAccount(req.body || {});
    issueToken(user, res);
    return res.redirect('/dashboard');
  } catch (error) {
    const status = error.code === 11000 ? 409 : error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.code === 11000 ? 'An account with that email already exists.' :
      error.name === 'ValidationError' ? Object.values(error.errors)[0].message :
      status === 500 ? 'Unable to create the account right now. Please try again.' : error.message;
    return res.status(status).render('signup', { title: 'Create an account', error: message, values });
  }
}

async function formLogin(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const user = await checkCredentials(req.body || {});
    issueToken(user, res);
    return res.redirect('/dashboard');
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).render('login', {
      title: 'Sign in', error: status === 500 ? 'Unable to sign in right now. Please try again.' : error.message, email
    });
  }
}

function clearAuthCookies(res) {
  res.clearCookie(cookieName, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('epharmacist.user', { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
}

function apiLogout(req, res) {
  clearAuthCookies(res);
  return res.json({ status: 'success', message: 'Signed out.' });
}

function logout(req, res) {
  clearAuthCookies(res);
  return res.redirect('/login');
}

module.exports = { apiSignup, apiLogin, apiLogout, formSignup, formLogin, logout, readToken, protectApi, protectPage };
