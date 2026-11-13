const express = require('express');
const users = require('../controllers/userController');
const auth = require('../controllers/authController');

const router = express.Router();
router.post('/signup', auth.apiSignup);
router.post('/login', auth.apiLogin);
router.post('/logout', auth.apiLogout);
router.use(auth.protectApi);
router.route('/').get(users.getAllUsers).post(users.createUser);
router.route('/:id')
  .all(users.validId)
  .get(users.getUser)
  .put(users.updateUser)
  .patch(users.updateUser)
  .delete(users.deleteUser);

module.exports = router;
