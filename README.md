# Captor

Sistema de auditoria e missões com dashboard React+Vite e backend Express+Prisma/Firebase Firestore.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   ```bash
   npm run dev
   ```

## Deploy to Production

### Firebase
1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Update `firebase.ts` with your project credentials

### Netlify
1. Push to your Git repository
2. Connect the repo to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy!
