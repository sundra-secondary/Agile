const express = require('express');
const auth = require('../controllers/authController');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/signup'));
router.get('/signup', auth.signupPage);
router.post('/signup', auth.signup);
router.get('/login', auth.loginPage);
router.post('/login', auth.login);
router.get('/dashboard', auth.dashboard);
router.post('/logout', auth.logout);

module.exports = router;
