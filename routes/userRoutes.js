const express = require('express');
const users = require('../controllers/userController');

const router = express.Router();
router.route('/').get(users.getAllUsers).post(users.createUser);
router.route('/:id')
  .all(users.validId)
  .get(users.getUser)
  .put(users.updateUser)
  .patch(users.updateUser)
  .delete(users.deleteUser);

module.exports = router;
