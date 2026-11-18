require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');

const email = String(process.env.SME_EMAIL || '').trim().toLowerCase();
const password = String(process.env.SME_PASSWORD || '');
const firstName = String(process.env.SME_FIRST_NAME || 'News').trim();
const lastName = String(process.env.SME_LAST_NAME || 'Editor').trim();
const uri = process.env.DATABASE_URL || process.env.DATABASE_LOCAL || 'mongodb://127.0.0.1:27017/epharmacist';

async function main() {
  if (!email || !password || password.length < 8) throw new Error('Set SME_EMAIL and SME_PASSWORD (at least 8 characters) in your ignored .env.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (await User.exists({ email })) throw new Error('That email already has an account. Choose a new SME_EMAIL.');
  await User.create({ firstName, lastName, email, role: 'sme', password, passwordConfirm: password });
  console.log(`Created SME account: ${email}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
