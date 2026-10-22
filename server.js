require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const port = Number(process.env.PORT) || 4001;
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_LOCAL || 'mongodb://127.0.0.1:27017/epharmacist';

async function start() {
  try {
    await mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 });
    app.listen(port, () => console.log(`ePharmacist is running on http://localhost:${port}`));
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) start();
module.exports = start;
