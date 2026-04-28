# Holliday's Lawn & Garden

## Project Overview
A professional multi-page website for Holliday's Lawn & Garden, a landscaping and lawn care business based in Louisiana. Features customer bookings, bill payments, admin dashboards, and a PayPal payment integration.

## Architecture
- **Frontend**: Static HTML/CSS/JavaScript multi-page application (no build step required)
- **Backend**: Node.js + Express server (`server.js`) that:
  - Serves all static HTML files from the project root
  - Provides PayPal API routes at `/api/` via `api/paypal-server.js`
- **Database/Auth**: Firebase (Firestore + Authentication) — configured client-side via `firebase-init.js`
- **Payments**: PayPal Checkout SDK (server-side order creation/capture)
- **PWA**: Service worker (`service-worker.js`) and manifest (`manifest.json`) for offline support

## Running the App
The app runs via the "Start application" workflow:
```
PORT=5000 node server.js
```
- Serves on port 5000 (0.0.0.0) for Replit preview compatibility
- The `.env` file contains `PORT=3000` by default, so the workflow overrides it with `PORT=5000`

## Key Files
- `server.js` — Express server entry point
- `api/paypal-server.js` — PayPal order creation and capture routes
- `firebase-init.js` — Firebase SDK initialization (client-side)
- `index.html` — Homepage
- `assets/` — CSS, JS modules, images, fonts, icons
- `.env` — Environment variables (PayPal credentials; PORT overridden at runtime)

## Environment Variables
- `PAYPAL_CLIENT_ID` — PayPal sandbox/production client ID
- `PAYPAL_CLIENT_SECRET` — PayPal sandbox/production client secret
- `PORT` — Server port (overridden to 5000 at runtime)

## Deployment
Configured for Autoscale deployment with run command: `node server.js`
Note: In production, ensure `PORT` environment variable is set to 5000 or configure via deployment settings.

## Pages
Major pages include: Home, About, Services, Education, FAQ, Contact, Reviews, Pay Your Bill, Customer Dashboard, Admin Dashboard, Appointments, Inventory, Staff, Gallery, and many payment status pages.

## Shared Styles
- `assets/css/header.css` — Single source of truth for the site-wide header and footer styles. Added as the last stylesheet in all public-facing pages so it overrides page-level CSS with `!important`. Fixes logo/nav overlap, ensures all login buttons are visible, and provides a consistent footer.

## Known Development Notes
- Firebase Analytics logs 403 errors on localhost — expected; Analytics only works on authorized domains (the production Firebase Hosting URL).
- Firestore `reviews` collection: `firestore.rules` allows public `list` for review queries; composite index added to `firestore.indexes.json` (approved + createdAt desc). Must be deployed with Firebase CLI (`firebase deploy --only firestore`) to take effect on production.
