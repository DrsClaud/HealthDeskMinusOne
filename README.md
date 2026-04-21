### Installation

Once the repo has been cloned, install all node packages with npm.

`npm install` (from repo root), then `cd functions && npm install` for Cloud Functions.

Once all dependencies are installed, the development server can be started with `npm run full`.
This starts the react front end as well as the backend server node.js/ express server.

The application can be built and deployed to Firebase using `npm run deploy:staging` and `npm run deploy:prod` to staging and production accordingly.

### Test Credit Card Info

- Card Number: 4242 4242 4242 4242
- Expiration: 04/24
- CVC: 424
