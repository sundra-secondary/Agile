const jwt = require('jsonwebtoken')

// Builds a valid Bearer token for a user id, signed with the test secret
exports.tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' })

// A valid news payload that satisfies every schema rule
exports.validNews = (overrides = {}) => ({
  title: 'Health ministry vigilant',
  description: 'India already has reported',
  content: 'Officials said any rash-like illness should be reported.',
  imageCover: 'news-1-cover.jpg',
  publishedBy: 'Sam Editor',
  user: '636b218525ad88b049693ecc',
  ...overrides,
})
exports.ids = {
  author: '636b218525ad88b049693ecc',
  patient: '636b218525ad88b049693ecd',
  otherSme: '636b218525ad88b049693ece',
  news: '636b218525ad88b049693ecf',
  missing: '636b218525ad88b049693ed0',
}
