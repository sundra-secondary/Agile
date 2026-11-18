const express = require('express');
const auth = require('../controllers/authController');
const news = require('../controllers/newsController');

const router = express.Router();
router.get('/', news.getAllNews);
router.get('/:id', auth.readToken, news.validId, news.getNews);
router.post('/', auth.protectApi, auth.restrictTo('sme'), news.createNews);
router.patch('/:id', auth.protectApi, auth.restrictTo('sme'), news.validId, news.updateNews);
router.delete('/:id', auth.protectApi, auth.restrictTo('sme'), news.validId, news.deleteNews);

module.exports = router;
