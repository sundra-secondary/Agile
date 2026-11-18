const mongoose = require('mongoose');
const News = require('../models/newsModel');
const AppError = require('../utils/AppError');

const fields = ['title', 'description', 'content', 'imageCover', 'isPublished'];

function newsInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('Send a JSON object.', 400);
  const input = Object.fromEntries(fields.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
  if (Object.hasOwn(input, 'isPublished') && typeof input.isPublished !== 'boolean') {
    throw new AppError('isPublished must be true or false.', 400);
  }
  return input;
}

function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Invalid news ID.', 400));
  return next();
}

async function getAllNews(req, res, next) {
  try {
    const news = await News.find({ isPublished: true }).sort({ publishedAt: -1 }).populate('user', 'firstName lastName');
    return res.json({ status: 'success', results: news.length, data: { news } });
  } catch (error) { return next(error); }
}

async function getNews(req, res, next) {
  try {
    const news = await News.findById(req.params.id).populate('user', 'firstName lastName');
    if (!news || (!news.isPublished && String(news.user?._id) !== req.user?.id)) {
      throw new AppError('News item not found.', 404);
    }
    return res.json({ status: 'success', data: { news } });
  } catch (error) { return next(error); }
}

async function createNews(req, res, next) {
  try {
    const input = newsInput(req.body);
    input.user = req.user.id;
    input.publishedBy = `${req.user.firstName} ${req.user.lastName}`;
    if (input.isPublished) input.publishedAt = new Date();
    const news = await News.create(input);
    return res.status(201).json({ status: 'success', data: { news } });
  } catch (error) { return next(error); }
}

async function updateNews(req, res, next) {
  try {
    const input = newsInput(req.body);
    if (!Object.keys(input).length) throw new AppError('Send news fields to update.', 400);
    const existing = await News.findById(req.params.id);
    if (!existing) throw new AppError('News item not found.', 404);
    if (String(existing.user) !== req.user.id) throw new AppError('You can edit only your news.', 403);
    if (input.isPublished === true && !existing.isPublished) input.publishedAt = new Date();
    if (input.isPublished === false) input.publishedAt = null;
    const news = await News.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true });
    return res.json({ status: 'success', data: { news } });
  } catch (error) { return next(error); }
}

async function deleteNews(req, res, next) {
  try {
    const existing = await News.findById(req.params.id);
    if (!existing) throw new AppError('News item not found.', 404);
    if (String(existing.user) !== req.user.id) throw new AppError('You can delete only your news.', 403);
    await existing.deleteOne();
    return res.status(204).end();
  } catch (error) { return next(error); }
}

module.exports = { validId, getAllNews, getNews, createNews, updateNews, deleteNews };
