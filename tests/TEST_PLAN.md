# Lab 10 test cycle: Sprint II news feed

## Scope and entry criteria

The Sprint II news routes, News model, authentication middleware, and dashboard already exist. Install dependencies with `npm ci` and keep a valid test JWT secret (set automatically by `tests/setup.js`). These automated checks use the Express app and mocked model calls; they never write to the production database.

## Test cases and expected results

| Area | Check | Expected result |
| --- | --- | --- |
| Schema | Required fields, description at 9/10/40/41 characters, long title, invalid author ID | Invalid documents fail validation; limits are inclusive at 10 and 40 |
| Public reads | List, published item, draft, missing item, malformed ID | Published items return 200; hidden/missing items 404; malformed ID 400 |
| Authentication | Anonymous write, tampered token, deleted user, cookie token | Unauthorized requests 401; valid SME cookie accepted |
| Authorization | Patient write, SME create, different SME edit/delete | Patient and nonowner get 403; verified SME author controls own content |
| Create/update | Server-owned author, publication timestamp, input type, schema error, validators | Create 201; update 200; malformed input 400; validators enabled |
| Delete | Owner delete | 204 with empty body |
| Regression | Existing account checks | All pass alongside Lab 10 tests |

## Execution and evidence

Run `npm test`, then `npm run test:unit` and `npm run test:acceptance` as needed to isolate failures. Run `npm run test:coverage` and inspect the terminal table and ignored `coverage/` report. The coverage gate is 80% statement and line coverage for the news controller. A passed coverage command is required before claiming that threshold was met.

Recorded on 18 November 2026: `npm test` passed all 5 existing account checks and all 49 Lab 10 tests. The coverage run passed all 49 Lab 10 tests and measured 95% statements, 91.17% branches, and 100% lines for `newsController.js`. The coverage command needed a local workaround for Jest's temporary-folder resolution in the Codex Windows environment; that workaround was not added to the project. `npm run test:atlas` also passed against the separate `epharmacist_integration` database, including real news creation, draft visibility, publication, ownership checks, and deletion. A visual dashboard check remains a hands-on tutor demonstration step.

The supplied sample tests referred to `userModels.js`, `newsFeedsController.js`, `/api/v1/news`, a 30-character description limit, and a 200 delete response. This project uses `userModel.js`, `newsController.js`, `/api/v1/newsFeeds`, a 40-character limit, and a 204 delete response. The tests were corrected to match the running application. The brief's red/green TDD examples are retained as regression cases because those faults had already been fixed in prior labs.

## Manual acceptance on a test database

1. Start MongoDB, configure an ignored `.env`, and run `npm start`.
2. Run `npm run seed:sme` with a fresh test SME email and password in `.env`. Sign in as the SME and create a published article using `api-collections/E-Pharmacist News.postman_collection.json`.
3. Open `/dashboard` as a guest. Confirm the article appears, then open its detail URL. Create a draft and confirm it is absent from the guest list.
4. Try a write as a patient and expect 403. Try the SME's own update and delete; expect 200 and 204. Confirm the deleted item returns 404.
5. Run `npm run test:integration` against a separate local test database for the existing account flow. Record any defects with request, expected result, actual result, fix, and rerun outcome.

Exit when automated tests pass, coverage meets the gate, and manual acceptance is recorded. The mocked HTTP checks provide fast regression evidence; the manual cycle checks real database persistence and the dashboard.
