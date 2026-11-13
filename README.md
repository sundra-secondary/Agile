# E-Pharmacist · Sprint I account signup

This project implements the patient/caregiver account flow from CSF202 Practicals 4, 5, and 6. It uses Express, MVC folders, MongoDB/Mongoose, JWT authentication, and browser/server form validation. Passwords are salted and hashed with bcrypt before storage.

## Run locally

1. Install Node.js 16 or newer and have a local MongoDB server running on port 27017, or obtain a MongoDB Atlas connection URI.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Set `DATABASE_URL` for Atlas or leave `DATABASE_LOCAL` for a local database. Replace the example `JWT_SECRET` with a unique random value of at least 32 characters. Startup requires this.
4. Run `npm start` and open <http://localhost:4001/signup>. For automatic restarts, run `npm run dev`.
5. Run `npm test` for the model and route checks.

With MongoDB running locally, run `npm run test:integration` to verify patient and caregiver signup, login, and password storage against a separate `epharmacist_integration` database. The test removes the accounts it creates. To test Atlas, set `TEST_DATABASE_URL` in your ignored `.env` to an Atlas URI for a separate test database, then run `npm run test:atlas`. Keep credentials out of Git.

The app waits for MongoDB before accepting requests. The local database name is `epharmacist`. Database credentials belong only in `.env`; that file is ignored by Git.

When opened in the provided VS Code dev container, Docker Compose starts a Node.js workspace and MongoDB and sets `DATABASE_LOCAL` to the MongoDB service address. Run `npm install` and `npm start` inside the container; port 4001 is forwarded automatically. Docker Desktop must be running for this option.

## Project structure

| Path | Purpose |
| --- | --- |
| `app.js`, `server.js` | Express app and database startup |
| `models/userModel.js` | MongoDB account schema and password hashing |
| `controllers/authController.js`, `routes/authRoutes.js` | JWT signup and login, form submission, logout |
| `controllers/viewController.js`, `routes/viewRoutes.js` | Signup, login, and guest or signed-in dashboard pages |
| `utils/AppError.js` | Predictable API errors |
| `controllers/userController.js`, `routes/userRoutes.js` | Practical 4 JSON user CRUD API |
| `api-collections/` | Collection to import into Thunder Client |
| `views/`, `public/` | EJS pages, CSS and browser validation |
| `Database/agile-lab-4.drawio` | Editable account ER diagram |
| `wireframes/account-flows.svg` | Signup and login wireframe |

## Sprint I account story

- [x] Create an account ERD and user model with patient/caregiver roles.
- [x] Design patient/caregiver signup and login screens.
- [x] Validate signup fields in the browser and on the server.
- [x] Save form data to MongoDB and verify login against the saved account.
- [x] Hash passwords before saving; omit hashes from normal user queries.
- [x] Connect to a local MongoDB instance and verify the full signup/login flow.
- [x] Add the Practical 4 CRUD, password validation, and hashing child tasks under Lab 4 in E-Pharmacist-Bomjan and move all four tasks to Done.
- [x] Add JWT signup and login, HTTP-only token cookies, protected routes, and central API error handling for Practical 5.
- [x] Add Lab 5 and its four Practical 5 child tasks in E-Pharmacist-Bomjan and move all five tasks to Done.
- [x] Connect signup and login forms to the API with Axios, show account alerts, render guest and signed-in dashboard states, and log out through the API for Practical 6.
- [x] Add Lab 7 and its four Practical 6 child tasks in E-Pharmacist-Bomjan and place all five in Done.

See [TODO.md](TODO.md) for the remaining Practical checks.

## Practical 4 user API

Import `api-collections/E-Pharmacist Users.postman_collection.json` from the Thunder Client Collections menu. Thunder Client accepts Postman 2.1 collections. Start the app, run **Sign up** or **Log in**, then paste the returned `token` and `user.id` into the collection's variables before running protected requests. Use a new email for each repeated signup request.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/v1/users/signup` | 201 with a JWT, user, and HTTP-only cookie |
| POST | `/api/v1/users/login` | 200 with a JWT, user, and HTTP-only cookie |
| POST | `/api/v1/users/logout` | 200 and clears the authentication and display-user cookies |
| GET | `/api/v1/users` | 200 with `{ "users": [...] }` |
| POST | `/api/v1/users` | 201 with `{ "user": {...} }` |
| GET | `/api/v1/users/:id` | 200 with `{ "user": {...} }` |
| PUT or PATCH | `/api/v1/users/:id` | 200 with the updated user |
| DELETE | `/api/v1/users/:id` | 204 with no body |

Signup requires `firstName`, `lastName`, `email`, `role` (`patient` or `caregiver`), `password` (at least eight characters), and matching `passwordConfirm`. A password update requires both password fields. Passwords are hashed with bcrypt before storage; `passwordConfirm` is discarded and neither field appears in API responses. The user CRUD routes require `Authorization: Bearer <token>` or the JWT cookie. Invalid input returns 400, invalid credentials or token 401, duplicate email 409, and a missing user 404.

The dashboard, signup, and login pages remain available at `/dashboard`, `/signup`, and `/login`. The dashboard shows a guest view until a user signs in. The signup and login pages send Axios requests to the JSON API and show success or error alerts. After success, the browser stores only the account ID, first name, and role in a display cookie; server-verified authentication determines the dashboard state. The JWT stays in an HTTP-only, SameSite Lax cookie and is marked Secure in production. The Sign out button calls the logout API and clears both cookies. `JWT_EXPIRES_IN` defaults to `90d`; `JWT_COOKIE_EXPIRES_IN` defaults to 90 days.

The app has a small account dashboard for checking the signed-in role. Pharmacist accounts, SME approval, reminders, and medical services belong to later backlog items.
