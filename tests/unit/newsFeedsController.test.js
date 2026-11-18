jest.mock('../../models/newsModel', () => ({
  find: jest.fn(), findById: jest.fn(), create: jest.fn(), findByIdAndUpdate: jest.fn()
}));

const News = require('../../models/newsModel');
const controller = require('../../controllers/newsController');
const { ids, validNews } = require('../helpers');

const author = { id: ids.author, firstName: 'Sam', lastName: 'Editor', role: 'sme' };
const req = (body = {}, id = ids.news, user = author) => ({ body, params: { id }, user });
const response = () => {
  const res = { status: jest.fn(), json: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
const query = value => ({
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(value)
});
const errorStatus = next => next.mock.calls[0][0].statusCode;

beforeEach(() => jest.clearAllMocks());

describe('news controller', () => {
  test('public list filters published items and sorts newest first', async () => {
    const items = [{ title: 'First' }];
    News.find.mockReturnValue(query(items));
    const res = response();
    await controller.getAllNews(req(), res, jest.fn());
    expect(News.find).toHaveBeenCalledWith({ isPublished: true });
    expect(News.find.mock.results[0].value.sort).toHaveBeenCalledWith({ publishedAt: -1 });
    expect(res.json).toHaveBeenCalledWith({ status: 'success', results: 1, data: { news: items } });
  });

  test('list forwards database errors', async () => {
    News.find.mockImplementation(() => { throw new Error('database unavailable'); });
    const next = jest.fn();
    await controller.getAllNews(req(), response(), next);
    expect(next.mock.calls[0][0].message).toBe('database unavailable');
  });

  test('reads a published item', async () => {
    const item = { isPublished: true, user: { _id: ids.author } };
    News.findById.mockReturnValue(query(item));
    const res = response();
    await controller.getNews(req({}, ids.news, undefined), res, jest.fn());
    expect(res.json.mock.calls[0][0].data.news).toBe(item);
  });

  test('hides a draft from another user but lets its author read it', async () => {
    const item = { isPublished: false, user: { _id: ids.author } };
    News.findById.mockReturnValue(query(item));
    const denied = jest.fn();
    await controller.getNews(req({}, ids.news, { id: ids.patient }), response(), denied);
    expect(errorStatus(denied)).toBe(404);
    const res = response();
    await controller.getNews(req(), res, jest.fn());
    expect(res.json.mock.calls[0][0].data.news).toBe(item);
  });

  test('returns 404 for missing item', async () => {
    News.findById.mockReturnValue(query(null));
    const next = jest.fn();
    await controller.getNews(req(), response(), next);
    expect(errorStatus(next)).toBe(404);
  });

  test('creates with verified author and ignores client-owned fields', async () => {
    News.create.mockImplementation(async input => input);
    const res = response();
    await controller.createNews(req({ ...validNews(), user: ids.patient, publishedBy: 'Imposter', isPublished: true }), res, jest.fn());
    expect(News.create.mock.calls[0][0]).toMatchObject({ user: ids.author, publishedBy: 'Sam Editor', isPublished: true });
    expect(News.create.mock.calls[0][0].publishedAt).toBeInstanceOf(Date);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('rejects a non-boolean publication flag', async () => {
    const next = jest.fn();
    await controller.createNews(req({ ...validNews(), isPublished: 'yes' }), response(), next);
    expect(errorStatus(next)).toBe(400);
    expect(News.create).not.toHaveBeenCalled();
  });

  test('rejects empty updates', async () => {
    const next = jest.fn();
    await controller.updateNews(req({ user: ids.author }), response(), next);
    expect(errorStatus(next)).toBe(400);
  });

  test('denies update by a different SME', async () => {
    News.findById.mockResolvedValue({ user: ids.otherSme });
    const next = jest.fn();
    await controller.updateNews(req({ title: 'Changed' }), response(), next);
    expect(errorStatus(next)).toBe(403);
    expect(News.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('publishes an owned draft with validation enabled', async () => {
    News.findById.mockResolvedValue({ user: ids.author, isPublished: false });
    News.findByIdAndUpdate.mockResolvedValue({ title: 'Published' });
    const res = response();
    await controller.updateNews(req({ isPublished: true }), res, jest.fn());
    const [, update, options] = News.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.publishedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ new: true, runValidators: true });
    expect(res.json).toHaveBeenCalled();
  });

  test('unpublishes an owned item', async () => {
    News.findById.mockResolvedValue({ user: ids.author, isPublished: true });
    News.findByIdAndUpdate.mockResolvedValue({});
    await controller.updateNews(req({ isPublished: false }), response(), jest.fn());
    expect(News.findByIdAndUpdate.mock.calls[0][1].$set.publishedAt).toBeNull();
  });

  test('denies deletion by a different SME', async () => {
    News.findById.mockResolvedValue({ user: ids.otherSme, deleteOne: jest.fn() });
    const next = jest.fn();
    await controller.deleteNews(req(), response(), next);
    expect(errorStatus(next)).toBe(403);
  });

  test('deletes an owned item', async () => {
    const item = { user: ids.author, deleteOne: jest.fn().mockResolvedValue() };
    News.findById.mockResolvedValue(item);
    const res = response();
    await controller.deleteNews(req(), res, jest.fn());
    expect(item.deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });
});
