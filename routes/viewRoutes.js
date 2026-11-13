const express = require('express');
const views = require('../controllers/viewController');
const auth = require('../controllers/authController');

const router = express.Router();
router.get('/', (req, res) => res.redirect('/signup'));
router.get('/signup', auth.readToken, views.signupPage);
router.get('/login', auth.readToken, views.loginPage);
router.get('/dashboard', auth.protectPage, views.dashboard);

module.exports = router;
