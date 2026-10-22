# E-Pharmacist · Sprint I account signup

This project implements the patient/caregiver account signup task from CSF202 Practical 4. It uses Express, MVC folders, MongoDB/Mongoose, and browser/server form validation. Passwords are salted and hashed with bcrypt before storage. The previous practical supplies the E-Pharmacist product backlog and user story.

## Run locally

1. Install Node.js 16 or newer and have a local MongoDB server running on port 27017, or obtain a MongoDB Atlas connection URI.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Set `DATABASE_URL` for Atlas or leave `DATABASE_LOCAL` for a local database. Replace the example `SESSION_SECRET` with a unique random value of at least 32 characters. Production startup requires this.
4. Run `npm start` and open <http://localhost:4001/signup>. For automatic restarts, run `npm run dev`.
5. Run `npm test` for the model and route checks.

With MongoDB running locally, run `npm run test:integration` to verify patient and caregiver signup, login, and password storage against a separate `epharmacist_integration` database. The test removes the accounts it creates. To test Atlas, set `TEST_DATABASE_URL` in your ignored `.env` to an Atlas URI for a separate test database, then run the same command. Keep credentials out of Git.

The app waits for MongoDB before accepting requests. The local database name is `epharmacist`. Database credentials belong only in `.env`; that file is ignored by Git.

When opened in the provided VS Code dev container, Docker Compose starts a Node.js workspace and MongoDB and sets `DATABASE_LOCAL` to the MongoDB service address. Run `npm install` and `npm start` inside the container; port 4001 is forwarded automatically. Docker Desktop must be running for this option.

## Project structure

| Path | Purpose |
| --- | --- |
| `app.js`, `server.js` | Express app and database startup |
| `models/userModel.js` | MongoDB account schema and password hashing |
| `controllers/authController.js`, `routes/authRoutes.js` | Signup, login, dashboard, logout |
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
- [x] Update the Jaggle.ai board and assign due dates in your own project.

See [TODO.md](TODO.md) for the remaining Practical checks.

The app has a small account dashboard for checking the signed-in role. Pharmacist accounts, SME approval, reminders, and medical services belong to later backlog items.
