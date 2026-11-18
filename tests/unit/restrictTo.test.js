const { restrictTo } = require('../../controllers/authController');

describe('SME authorization', () => {
  const middleware = restrictTo('sme');

  test('allows an SME', () => {
    const next = jest.fn();
    middleware({ user: { role: 'sme' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test.each([undefined, { role: 'patient' }, { role: 'caregiver' }])(
    'denies a missing or non-SME user', user => {
      const next = jest.fn();
      middleware({ user }, {}, next);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    }
  );
});
