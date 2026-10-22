const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const app = require('../app');
const User = require('../models/userModel');

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
  const valid = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'KARMA@example.com', role: 'patient', password: 'longpassword' });
  await valid.validate();
  assert.equal(valid.email, 'karma@example.com');
  assert.equal(User.schema.path('password').options.select, false);
  const invalid = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'bad-email', role: 'admin', password: 'short' });
  await assert.rejects(invalid.validate(), error => {
    assert.equal(error.name, 'ValidationError');
    assert.ok(error.errors.email);
    assert.ok(error.errors.role);
    assert.ok(error.errors.password);
    return true;
  });
});

test('password save hook hashes the secret and verification rejects wrong passwords', async () => {
  const user = new User({ firstName: 'Karma', lastName: 'Wangmo', email: 'karma@example.com', role: 'caregiver', password: 'correct horse battery' });
  const hook = User.schema.s.hooks._pres.get('save').find(entry => entry.fn.name === 'hashPassword');
  assert.ok(hook, 'password hashing hook is registered');
  await new Promise((resolve, reject) => hook.fn.call(user, error => error ? reject(error) : resolve()));
  assert.notEqual(user.password, 'correct horse battery');
  assert.equal(await bcrypt.compare('correct horse battery', user.password), true);
  assert.equal(await user.verifyPassword('incorrect'), false);
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
    const dashboard = await request(port, '/dashboard');
    assert.equal(dashboard.status, 302);
    assert.equal(dashboard.headers.location, '/login');
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
