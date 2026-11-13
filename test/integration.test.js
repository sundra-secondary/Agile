require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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

function requestJson(port, path, method = 'GET', fields, token = '') {
  const body = fields === undefined ? '' : JSON.stringify(fields);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...(token ? { authorization: `Bearer ${token}` } : {}) }
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, body: text ? JSON.parse(text) : null }));
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
  let activeCookie;
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
      assert.match(signup.headers['set-cookie'][0], /HttpOnly/);
      assert.match(signup.headers['set-cookie'][0], /SameSite=Lax/);

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
      assert.match(logout.headers['set-cookie'][0], /epharmacist\.jwt=;/);
      const login = await request(port, '/login', 'POST', { email, password });
      assert.equal(login.status, 302);
      assert.equal(login.headers.location, '/dashboard');
      const loginCookie = login.headers['set-cookie'][0].split(';')[0];
      activeCookie = loginCookie;
      assert.equal((await request(port, '/dashboard', 'GET', {}, loginCookie)).status, 200);
    }

    const email = `api-test-${randomUUID()}@example.com`;
    emails.push(email);
    const base = '/api/v1/users';
    const fields = { firstName: 'Api', lastName: 'Test', email, role: 'patient', password: 'initial-password', passwordConfirm: 'initial-password' };
    const invalid = await requestJson(port, `${base}/signup`, 'POST', { ...fields, passwordConfirm: 'different' });
    assert.equal(invalid.status, 400);
    assert.equal(await User.countDocuments({ email }), 0);
    const created = await requestJson(port, `${base}/signup`, 'POST', fields);
    assert.equal(created.status, 201, created.text);
    assert.equal(created.body.user.email, email);
    assert.match(created.body.token, /^[^.]+\.[^.]+\.[^.]+$/);
    const claims = jwt.verify(created.body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, created.body.user.id);
    assert.equal(Object.hasOwn(claims, 'password'), false);
    assert.match(created.headers['set-cookie'][0], /HttpOnly/);
    assert.match(created.headers['set-cookie'][0], /SameSite=Lax/);
    assert.equal(JSON.stringify(created.body).includes('password'), false);
    const token = created.body.token;
    const id = created.body.user.id;
    assert.equal((await requestJson(port, `${base}/signup`, 'POST', fields)).status, 409);
    assert.equal((await requestJson(port, base)).status, 401);
    assert.equal((await requestJson(port, base, 'GET', undefined, `${token}tampered`)).status, 401);
    assert.equal((await requestJson(port, `${base}/login`, 'POST', { email, password: 'wrong-password' })).status, 401);
    const apiLogin = await requestJson(port, `${base}/login`, 'POST', { email, password: fields.password });
    assert.equal(apiLogin.status, 200);
    assert.match(apiLogin.body.token, /^[^.]+\.[^.]+\.[^.]+$/);
    const list = await requestJson(port, base, 'GET', undefined, token);
    assert.equal(list.status, 200);
    assert.ok(list.body.users.some(user => user.id === id));
    assert.equal(JSON.stringify(list.body).includes('password'), false);
    assert.equal((await requestJson(port, `${base}/${id}`, 'GET', undefined, token)).body.user.email, email);
    assert.equal((await requestJson(port, `${base}/bad-id`, 'GET', undefined, token)).status, 400);
    const mismatch = await requestJson(port, `${base}/${id}`, 'PATCH', { password: 'changed-password', passwordConfirm: 'different' }, token);
    assert.equal(mismatch.status, 400);
    const before = await User.findById(id).select('+password');
    assert.equal(await before.verifyPassword('initial-password'), true);
    const updated = await requestJson(port, `${base}/${id}`, 'PUT', { password: 'changed-password', passwordConfirm: 'changed-password', role: 'caregiver' }, token);
    assert.equal(updated.status, 200, updated.text);
    assert.equal(updated.body.user.role, 'caregiver');
    assert.equal(JSON.stringify(updated.body).includes('password'), false);
    const after = await User.findById(id).select('+password +passwordConfirm');
    assert.equal(await after.verifyPassword('changed-password'), true);
    assert.equal(after.passwordConfirm, undefined);
    assert.equal((await requestJson(port, `${base}/${id}`, 'DELETE', undefined, token)).status, 204);
    assert.equal((await requestJson(port, `${base}/${id}`, 'GET', undefined, token)).status, 401);
    const otherCookieResponse = await request(port, `${base}/${id}`, 'GET', {}, activeCookie);
    assert.equal(otherCookieResponse.status, 404);
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
