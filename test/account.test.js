const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const app = require('../app');
const User = require('../models/userModel');

test('application refuses missing or example JWT secrets', () => {
  for (const secret of ['', 'replace-with-a-unique-random-secret-at-least-32-characters-long', 'too-short']) {
    const result = spawnSync(process.execPath, ['-e', "require('./app')"], {
      cwd: require('node:path').join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: secret },
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Set JWT_SECRET/);
  }
  const valid = spawnSync(process.execPath, ['-e', "require('./app')"], {
    cwd: require('node:path').join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'a-unique-jwt-secret-with-more-than-32-characters' },
    encoding: 'utf8'
  });
  assert.equal(valid.status, 0, valid.stderr);
});

function request(port, path, method = 'GET', body = '', cookie = '') {
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

test('account schema validates role and email without a database', async () => {
  const valid = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'KARMA@example.com', role: 'patient', password: 'longpassword', passwordConfirm: 'longpassword' });
  await valid.validate();
  assert.equal(valid.email, 'karma@example.com');
  assert.equal(User.schema.path('password').options.select, false);
  assert.equal(User.schema.path('passwordConfirm').options.select, false);
  const invalid = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'bad-email', role: 'admin', password: 'short' });
  await assert.rejects(invalid.validate(), error => {
    assert.equal(error.name, 'ValidationError');
    assert.ok(error.errors.email);
    assert.ok(error.errors.role);
    assert.ok(error.errors.password);
    return true;
  });
  const mismatch = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'karma@example.com', role: 'patient', password: 'longpassword', passwordConfirm: 'different' });
  await assert.rejects(mismatch.validate(), /Passwords do not match/);
});

test('password save hook hashes the secret and verification rejects wrong passwords', async () => {
  const user = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'karma@example.com', role: 'caregiver', password: 'correct horse battery', passwordConfirm: 'correct horse battery' });
  const hook = User.schema.s.hooks._pres.get('save').find(entry => entry.fn.name === 'hashPassword');
  assert.ok(hook, 'password hashing hook is registered');
  await new Promise((resolve, reject) => hook.fn.call(user, error => error ? reject(error) : resolve()));
  assert.notEqual(user.password, 'correct horse battery');
  assert.equal(await bcrypt.compare('correct horse battery', user.password), true);
  assert.equal(await user.verifyPassword('incorrect'), false);
  assert.equal(user.passwordConfirm, undefined);
});

test('password update hook rejects mismatches and hashes matching updates', async () => {
  const hook = User.schema.s.hooks._pres.get('findOneAndUpdate').find(entry => entry.fn.name === 'hashUpdatedPassword');
  assert.ok(hook);
  const invalid = { $set: { password: 'new-password', passwordConfirm: 'different' } };
  await assert.rejects(hook.fn.call({ getUpdate: () => invalid }), /passwordConfirm/);
  assert.equal(invalid.$set.password, 'new-password');
  const valid = { $set: { password: 'new-password', passwordConfirm: 'new-password' } };
  await hook.fn.call({ getUpdate: () => valid });
  assert.equal(await bcrypt.compare('new-password', valid.$set.password), true);
  assert.equal(Object.hasOwn(valid.$set, 'passwordConfirm'), false);
});

test('account routes render and reject invalid signup before database access', async () => {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const signup = await request(port, '/signup');
    assert.equal(signup.status, 200);
    assert.match(signup.text, /Create your account/);
    assert.match(signup.text, /Patient/);
    assert.match(signup.text, /Caregiver/);
    const login = await request(port, '/login');
    assert.equal(login.status, 200);
    assert.match(login.text, /Sign in/);
    assert.match(login.text, /\/js\/login\.js/);
    assert.match(signup.text, /\/js\/signup\.js/);
    const dashboard = await request(port, '/dashboard');
    assert.equal(dashboard.status, 200);
    assert.match(dashboard.text, /Your care starts here/);
    assert.doesNotMatch(dashboard.text, /YOUR ACCOUNT/);
    const profile = await request(port, '/me');
    assert.equal(profile.status, 302);
    assert.equal(profile.headers.location, '/login');
    assert.equal((await request(port, '/api/v1/users/me')).status, 401);
    const protectedApi = await request(port, '/api/v1/users');
    assert.equal(protectedApi.status, 401);
    assert.match(protectedApi.text, /Sign in/);
    const missingLogin = await request(port, '/api/v1/users/login', 'POST', '');
    assert.equal(missingLogin.status, 400);
    const apiLogout = await request(port, '/api/v1/users/logout', 'POST', '');
    assert.equal(apiLogout.status, 200);
    assert.match(apiLogout.headers['set-cookie'][0], /epharmacist\.jwt=;/);
    const badSignup = await request(port, '/signup', 'POST', new URLSearchParams({
      firstName: 'Karma', lastName: 'Wangmo', email: 'karma@example.com',
      role: 'patient', password: 'password1', confirmPassword: 'different'
    }).toString());
    assert.equal(badSignup.status, 400);
    assert.match(badSignup.text, /Passwords do not match/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
