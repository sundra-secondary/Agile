jest.mock('../../models/userModel', () => ({ findById: jest.fn() }));
jest.mock('../../models/newsModel', () => ({
  find: jest.fn(), findById: jest.fn(), create: jest.fn(), findByIdAndUpdate: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/userModel');
const News = require('../../models/newsModel');
const { ids, tokenFor, validNews } = require('../helpers');

const base = '/api/v1/newsFeeds';
const auth = id => ({ Authorization: `Bearer ${tokenFor(id)}` });
const item = (overrides = {}) => ({ _id: ids.news, isPublished: true, user: ids.author, ...overrides });
const populated = value => ({ populate: jest.fn().mockResolvedValue(value) });

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockImplementation(async id => {
    if (id === ids.author) return { id, role: 'sme', firstName: 'Sam', lastName: 'Editor' };
    if (id === ids.patient) return { id, role: 'patient', firstName: 'Pat', lastName: 'User' };
    if (id === ids.otherSme) return { id, role: 'sme', firstName: 'Other', lastName: 'Editor' };
    return null;
  });
});

describe('news HTTP routes', () => {
  test('guests list published news', async () => {
    News.find.mockReturnValue({ sort: jest.fn().mockReturnValue(populated([item()])) });
    const res = await request(app).get(base);
    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
    expect(News.find).toHaveBeenCalledWith({ isPublished: true });
  });

  test('guests read a published item', async () => {
    News.findById.mockReturnValue(populated(item()));
    const res = await request(app).get(`${base}/${ids.news}`);
    expect(res.status).toBe(200);
    expect(res.body.data.news._id).toBe(ids.news);
  });

  test('drafts and unknown items return 404', async () => {
    News.findById.mockReturnValueOnce(populated(item({ isPublished: false, user: { _id: ids.author } })))
      .mockReturnValueOnce(populated(null));
    expect((await request(app).get(`${base}/${ids.news}`)).status).toBe(404);
    expect((await request(app).get(`${base}/${ids.missing}`)).status).toBe(404);
  });

  test('invalid item id returns 400', async () => {
    expect((await request(app).get(`${base}/wrong-id`)).status).toBe(400);
  });

  test.each(['post', 'patch', 'delete'])('anonymous %s is 401', async method => {
    const url = method === 'post' ? base : `${base}/${ids.news}`;
    const res = await request(app)[method](url).send(method === 'delete' ? undefined : validNews());
    expect(res.status).toBe(401);
    expect(News.create).not.toHaveBeenCalled();
    expect(News.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test.each(['post', 'patch', 'delete'])('patient %s is 403', async method => {
    const url = method === 'post' ? base : `${base}/${ids.news}`;
    const res = await request(app)[method](url).set(auth(ids.patient)).send(method === 'delete' ? undefined : validNews());
    expect(res.status).toBe(403);
    expect(News.create).not.toHaveBeenCalled();
    expect(News.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('SME creates news and server owns its author', async () => {
    News.create.mockImplementation(async input => ({ _id: ids.news, ...input }));
    const res = await request(app).post(base).set(auth(ids.author))
      .send({ ...validNews(), user: ids.patient, publishedBy: 'Fake', isPublished: true });
    expect(res.status).toBe(201);
    expect(res.body.data.news.user).toBe(ids.author);
    expect(res.body.data.news.publishedBy).toBe('Sam Editor');
  });

  test('malformed news is rejected with 400', async () => {
    const res = await request(app).post(base).set(auth(ids.author)).send({ ...validNews(), isPublished: 'yes' });
    expect(res.status).toBe(400);
    expect(News.create).not.toHaveBeenCalled();
  });

  test('schema validation errors become 400', async () => {
    const error = new Error('invalid title');
    error.name = 'ValidationError';
    error.errors = { title: { message: 'News title is required.' } };
    News.create.mockRejectedValue(error);
    const res = await request(app).post(base).set(auth(ids.author)).send(validNews({ title: '' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('News title is required.');
  });

  test('tampered token is rejected', async () => {
    const token = tokenFor(ids.author);
    const tampered = `${token.slice(0, -1)}${token.at(-1) === 'a' ? 'b' : 'a'}`;
    const res = await request(app).post(base).set('Authorization', `Bearer ${tampered}`).send(validNews());
    expect(res.status).toBe(401);
  });

  test('token for a deleted account is rejected', async () => {
    const res = await request(app).post(base).set(auth(ids.missing)).send(validNews());
    expect(res.status).toBe(401);
  });

  test('SME author updates news', async () => {
    News.findById.mockResolvedValue(item({ isPublished: false }));
    News.findByIdAndUpdate.mockResolvedValue(item({ title: 'Updated' }));
    const res = await request(app).patch(`${base}/${ids.news}`).set(auth(ids.author)).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(News.findByIdAndUpdate.mock.calls[0][2].runValidators).toBe(true);
  });

  test('different SME cannot update or delete news', async () => {
    News.findById.mockResolvedValue(item({ deleteOne: jest.fn() }));
    expect((await request(app).patch(`${base}/${ids.news}`).set(auth(ids.otherSme)).send({ title: 'Mine' })).status).toBe(403);
    expect((await request(app).delete(`${base}/${ids.news}`).set(auth(ids.otherSme))).status).toBe(403);
    expect(News.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('SME author deletes news', async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    News.findById.mockResolvedValue(item({ deleteOne }));
    const res = await request(app).delete(`${base}/${ids.news}`).set(auth(ids.author));
    expect(res.status).toBe(204);
    expect(deleteOne).toHaveBeenCalledTimes(1);
  });

  test('cookie authentication works for an SME', async () => {
    News.create.mockImplementation(async input => input);
    const res = await request(app).post(base)
      .set('Cookie', `epharmacist.jwt=${tokenFor(ids.author)}`).send(validNews());
    expect(res.status).toBe(201);
  });
});
