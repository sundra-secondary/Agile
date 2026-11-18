# Lab 10: news feed quality checks

These tests began with the supplied `tests.zip` and were adapted to this project's actual Sprint II names, routes, validation rules, and response codes. They run without a MongoDB connection: HTTP requests reach the real Express app while model calls use controlled mocks. The earlier account tests remain in `test/account.test.js`.

| Command | Checks |
| --- | --- |
| `npm test` | Existing account checks and all Lab 10 tests |
| `npm run test:unit` | News schema, SME permission, and controller logic |
| `npm run test:acceptance` | HTTP routes, authentication, authorization, and responses |
| `npm run test:coverage` | Lab 10 tests with coverage for the news controller, model, and routes |
| `npm run test:integration` | Existing account flow against a local test database |

The coverage command enforces 80% statement and line coverage for `controllers/newsController.js`. Generated reports go to ignored `coverage/`.

See [TEST_PLAN.md](TEST_PLAN.md) for the test cycle and hands-on database/browser checks. No test in this folder writes to a live database.
