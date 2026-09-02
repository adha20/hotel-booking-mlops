# Hotel Booking Web App

Next.js frontend for the Hotel Booking Cancellation MLOps project. The app simulates a lightweight hotel booking flow and sends each reservation to the deployed FastAPI model service for cancellation-risk prediction.

## Main Features

- Customer-facing hotel booking page with room selection and reservation form.
- Staff console with cancellation probability, risk level, and recommended action.
- Browser-side prediction history using localStorage for demo purposes.
- Server-side API proxy from Next.js to the Railway FastAPI service.
- Optional external link to a public Grafana Cloud dashboard.

## Environment Variables

Create `.env.local` for local development:

```env
HOTEL_API_BASE_URL=https://your-railway-api-url.up.railway.app
NEXT_PUBLIC_GRAFANA_DASHBOARD_URL=https://your-public-grafana-dashboard-url
```

`HOTEL_API_BASE_URL` is required by Next.js route handlers on the server and should contain the real FastAPI/Railway base URL only in `.env.local` or Vercel Environment Variables. The `NEXT_PUBLIC_*` variables are visible in the browser, so use them only for public links and never for credentials.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

When importing the monorepo into Vercel, set:

```text
Framework Preset: Next.js
Root Directory: apps/web
Build Command: npm run build
Output Directory: .next
```

Add the same environment variables in Vercel Project Settings, then deploy from the `main` branch.
