# CRM App Setup

## Step 1: Install Node.js
Download and install from: https://nodejs.org (LTS version recommended)
After installing, restart your terminal/PowerShell.

## Step 2: Install Dependencies
Open PowerShell, navigate to this folder, and run:

```
cd "C:\Users\Jerry Hester\crm-app"
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Step 3: Run the App
From the `crm-app` folder:

```
npm run dev
```

This starts:
- Backend API on http://localhost:3001
- Frontend app on http://localhost:5173

Open http://localhost:5173 in your browser.

## First Run
The database is automatically created and seeded with 10 sample records
(across Individual, Institution, and Platform types) when the backend first starts.
