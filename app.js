require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const viewRoutes = require('./routes/viewRoutes');
const userRoutes = require('./routes/userRoutes');
const AppError = require('./utils/AppError');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.startsWith('replace-with-')) {
  throw new Error('Set JWT_SECRET to a unique value of at least 32 characters.');
}

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(viewRoutes);
app.use(authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/', (req, res, next) => next(new AppError('API route not found.', 404)));
app.use((req, res) => res.status(404).render('message', {
  title: 'Page not found', message: 'The page you requested does not exist.', action: '/'
}));
app.use((error, req, res, next) => {
  const status = error.code === 11000 ? 409 : error.statusCode ||
    (error.name === 'ValidationError' || error.type === 'entity.parse.failed' ? 400 : 500);
  const message = error.code === 11000 ? 'An account with that email already exists.' :
    error.name === 'ValidationError' ? Object.values(error.errors)[0].message :
    status === 500 ? 'Unable to process the request.' : error.message;
  if (res.headersSent) return next(error);
  return res.status(status).json({ error: message });
});

module.exports = app;
