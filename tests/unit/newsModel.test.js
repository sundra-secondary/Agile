const News = require('../../models/newsModel');
const { validNews } = require('../helpers');

describe('News schema', () => {
  test('accepts a complete draft with safe defaults', () => {
    const news = new News(validNews());
    expect(news.validateSync()).toBeUndefined();
    expect(news.isPublished).toBe(false);
    expect(news.publishedAt).toBeNull();
  });

  test.each(['title', 'description', 'content', 'imageCover', 'publishedBy', 'user'])(
    'requires %s', field => {
      const news = new News(validNews({ [field]: undefined }));
      expect(news.validateSync().errors[field]).toBeDefined();
    }
  );

  test.each([[9, false], [10, true], [40, true], [41, false]])(
    'description length %i is valid: %s', (length, valid) => {
      const news = new News(validNews({ description: 'x'.repeat(length) }));
      expect(!news.validateSync()?.errors?.description).toBe(valid);
    }
  );

  test('rejects a title longer than 120 characters', () => {
    expect(new News(validNews({ title: 'x'.repeat(121) })).validateSync().errors.title).toBeDefined();
  });

  test('rejects an invalid author id', () => {
    expect(new News(validNews({ user: 'invalid' })).validateSync().errors.user).toBeDefined();
  });
});
