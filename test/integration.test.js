require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');

function request(port, path, method = 'GET', fields = {}, cookie = '') {
  const body = new URLSearchParams(fields).toString();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': Buffer.byteLength(body),
        ...(cookie ? { cookie } : {})
      }
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('patient and caregiver signup, stored hashes, and login against MongoDB', { timeout: 30000 }, async () => {
  const atlasRequested = process.argv.includes('--atlas');
  const atlasUri = process.env.TEST_DATABASE_URL;
  let atlasTestDatabase = false;
  if (atlasUri) {
    try { atlasTestDatabase = new URL(atlasUri).pathname === '/epharmacist_integration'; } catch { /* Invalid URI. */ }
  }
  if (atlasRequested && (!atlasUri || !atlasUri.startsWith('mongodb+srv://') ||
      atlasUri.includes('CLUSTER.mongodb.net') || atlasUri.includes('REPLACE_WITH_DATABASE_PASSWORD') || !atlasTestDatabase)) {
    throw new Error('Set TEST_DATABASE_URL in .env to your Atlas URI with /epharmacist_integration before running npm run test:atlas.');
  }
  const uri = atlasRequested ? atlasUri : 'mongodb://127.0.0.1:27017/epharmacist_integration';
  const emails = [];
  let server;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    server = app.listen(0);
    const port = server.address().port;

    for (const role of ['patient', 'caregiver']) {
      const email = `sprint-test-${randomUUID()}@example.com`;
      const password = `test-password-${randomUUID()}`;
      emails.push(email);

      const signup = await request(port, '/signup', 'POST', {
        firstName: 'Test', lastName: 'Account', email, role,
        password, confirmPassword: password
      });
      assert.equal(signup.status, 302, signup.text);
      assert.equal(signup.headers.location, '/dashboard');
      const signupCookie = signup.headers['set-cookie'][0].split(';')[0];

      const dashboard = await request(port, '/dashboard', 'GET', {}, signupCookie);
      assert.equal(dashboard.status, 200);
      assert.match(dashboard.text, new RegExp(`signed in as a <strong>${role}</strong>`));

      const saved = await User.findOne({ email }).select('+password');
      assert.ok(saved);
      assert.equal(saved.role, role);
      assert.notEqual(saved.password, password);
      assert.match(saved.password, /^\$2[aby]\$/);
      assert.equal(await saved.verifyPassword(password), true);

      const badLogin = await request(port, '/login', 'POST', { email, password: 'incorrect-password' });
      assert.equal(badLogin.status, 401);

      const logout = await request(port, '/logout', 'POST', {}, signupCookie);
      assert.equal(logout.status, 302);
      const login = await request(port, '/login', 'POST', { email, password });
      assert.equal(login.status, 302);
      assert.equal(login.headers.location, '/dashboard');
      const loginCookie = login.headers['set-cookie'][0].split(';')[0];
      assert.equal((await request(port, '/dashboard', 'GET', {}, loginCookie)).status, 200);
    }
  } finally {
    try {
      if (mongoose.connection.readyState === 1 && emails.length) {
        await User.deleteMany({ email: { $in: emails } });
      }
    } finally {
      if (server) await new Promise(resolve => server.close(resolve));
      await mongoose.disconnect();
    }
  }
});
