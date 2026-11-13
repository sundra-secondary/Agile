const mongoose = require('mongoose');
const User = require('../models/userModel');

const writableFields = ['firstName', 'lastName', 'email', 'role', 'password', 'passwordConfirm'];

function inputFrom(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return Object.fromEntries(writableFields.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function sendError(res, error) {
  if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(error.errors)[0].message });
  }
  if (error.name === 'CastError' || error.message.includes('passwordConfirm')) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Unable to process the user request.' });
}

function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid user ID.' });
  next();
}

async function getAllUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json({ users: users.map(publicUser) });
  } catch (error) { return sendError(res, error); }
}

async function createUser(req, res) {
  const input = inputFrom(req.body);
  if (!input) return res.status(400).json({ error: 'Send a JSON object.' });
  try {
    const user = await User.create(input);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) { return sendError(res, error); }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (error) { return sendError(res, error); }
}

async function updateUser(req, res) {
  const input = inputFrom(req.body);
  if (!input || !Object.keys(input).length) return res.status(400).json({ error: 'Send fields to update.' });
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (error) { return sendError(res, error); }
}

async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(204).end();
  } catch (error) { return sendError(res, error); }
}

module.exports = { validId, getAllUsers, createUser, getUser, updateUser, deleteUser };
