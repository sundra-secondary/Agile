// Runs before every test file: gives the app the environment variables it needs
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'lab-ten-only-test-secret-at-least-32-chars'
process.env.JWT_EXPIRES_IN = '1d'
process.env.JWT_COOKIE_EXPIRES_IN = '1'
