const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');

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
    photo: user.photo,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const uploadPhoto = upload.single('photo');

function imageExtension(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

function getMe(req, res) {
  return res.json({ user: publicUser(req.user) });
}

async function updateMe(req, res, next) {
  let savedPath;
  try {
    if (['password', 'passwordConfirm', 'passwordCurrent', 'role', 'photo', 'userId'].some(key => Object.hasOwn(req.body || {}, key))) {
      throw new AppError('Use the password endpoint for passwords; role and photo path cannot be set here.', 400);
    }
    const fields = Object.fromEntries(['firstName', 'lastName', 'email']
      .filter(key => Object.hasOwn(req.body || {}, key)).map(key => [key, String(req.body[key]).trim()]));
    if (req.file) {
      const extension = imageExtension(req.file.buffer);
      if (!extension) throw new AppError('Upload a valid JPEG, PNG, or WebP image.', 400);
      const directory = path.join(__dirname, '..', 'public', 'uploads', 'users');
      await fs.mkdir(directory, { recursive: true });
      const filename = `${randomUUID()}${extension}`;
      savedPath = path.join(directory, filename);
      await fs.writeFile(savedPath, req.file.buffer, { flag: 'wx' });
      fields.photo = `/uploads/users/${filename}`;
    }
    if (!Object.keys(fields).length) throw new AppError('Send account fields or a photo to update.', 400);
    const user = await User.findByIdAndUpdate(req.user.id, { $set: fields }, { new: true, runValidators: true });
    if (!user) throw new AppError('User not found.', 404);
    return res.json({ status: 'success', user: publicUser(user) });
  } catch (error) {
    if (savedPath) await fs.unlink(savedPath).catch(() => {});
    return next(error);
  }
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
  if (input.role === 'sme') return res.status(403).json({ error: 'SME accounts cannot be created through the public API.' });
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
  if (input.role === 'sme') return res.status(403).json({ error: 'SME role cannot be assigned through the public API.' });
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found.' });
    if (existing.role === 'sme' && req.user.role !== 'sme') return res.status(403).json({ error: 'SME accounts cannot be changed by this user.' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (error) { return sendError(res, error); }
}

async function deleteUser(req, res) {
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found.' });
    if (existing.role === 'sme' && req.user.role !== 'sme') return res.status(403).json({ error: 'SME accounts cannot be deleted by this user.' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(204).end();
  } catch (error) { return sendError(res, error); }
}

module.exports = { validId, getAllUsers, createUser, getUser, updateUser, deleteUser, getMe, updateMe, uploadPhoto };
