const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'News title is required.'], trim: true, maxlength: 120 },
  description: { type: String, required: [true, 'News description is required.'], trim: true, minlength: 10, maxlength: 40 },
  content: { type: String, required: [true, 'News content is required.'], trim: true },
  imageCover: { type: String, required: [true, 'A cover image is required.'], trim: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  publishedBy: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

newsSchema.index({ isPublished: 1, publishedAt: -1 });

module.exports = mongoose.model('News', newsSchema);
