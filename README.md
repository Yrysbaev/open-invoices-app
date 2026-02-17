# Open Invoices App

Mobile-friendly web app for your sales team to view and download open invoices from QuickBooks Online.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create Intuit Developer app**
   - Go to [developer.intuit.com](https://developer.intuit.com)
   - Create an app → enable QuickBooks Online
   - Get `CLIENT_ID` and `CLIENT_SECRET`
   - Add redirect URI: `http://localhost:3000/api/qbo/callback` (local) or `https://yourdomain.com/api/qbo/callback` (production)

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your QuickBooks credentials.
   For production on Vercel, also set:
   ```env
   DATABASE_URL=your_postgres_connection_string
   ```

4. **Seed sales users**
   ```bash
   npm run seed:users
   ```

5. **Run dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Flow

1. Open `/login` and sign in with your sales email + password
2. Admin connects QuickBooks once via `/api/qbo/connect`
3. Search/select a customer
4. View open invoices
5. **Download PDF** (single) or **Download all as ZIP**

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add env vars: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI` (your Vercel URL + `/api/qbo/callback`), `QBO_ENV`
4. Update redirect URI in Intuit Developer to match production URL

## Mobile

Works great on iPhone. Use **Add to Home Screen** for an app-like experience.
