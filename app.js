const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' &&
    (!sessionSecret || sessionSecret.length < 32 || sessionSecret === 'replace-with-a-long-random-secret')) {
  throw new Error('Set SESSION_SECRET to a unique value of at least 32 characters in production.');
}

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(session({
  name: 'epharmacist.sid',
  secret: sessionSecret || 'local-development-only-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(authRoutes);
app.use((req, res) => res.status(404).render('message', {
  title: 'Page not found', message: 'The page you requested does not exist.', action: '/'
}));

module.exports = app;
