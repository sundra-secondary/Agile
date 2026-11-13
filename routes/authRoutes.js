const express = require('express');
const auth = require('../controllers/authController');

const router = express.Router();
router.post('/signup', auth.formSignup);
router.post('/login', auth.formLogin);
router.post('/logout', auth.logout);

module.exports = router;
