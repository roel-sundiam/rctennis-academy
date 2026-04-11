# Deployment Guide — Renell Crescini Tennis Academy

Live URL: https://rctennis-academy.netlify.app  
Netlify dashboard: https://app.netlify.com/projects/rctennis-academy

---

## Prerequisites

- Node.js installed
- Netlify CLI installed: `npm install -g netlify-cli`
- Logged in to Netlify: `netlify login`
- Project linked (already done — the `.netlify/state.json` file handles this)

---

## How to Redeploy

Any time you make changes to the code, run this single command from the project root (`c:\Projects2\RCTennis`):

```bash
netlify deploy --prod
```

That's it. Netlify reads `netlify.toml` and automatically:
1. Installs backend dependencies
2. Installs frontend dependencies
3. Builds the Angular app
4. Bundles the backend as a serverless function
5. Uploads everything and goes live

Wait for **"Deploy is live!"** — usually takes about 1 minute.

> **Do not use** `--dir` or `--build=false`. Those flags skip the build step and
> will deploy outdated files. Always let `netlify.toml` drive the build.

---

## How to Run Locally (for testing before deploying)

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd c:/Projects2/RCTennis/backend
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd c:/Projects2/RCTennis/frontend
ng serve
```

Then open http://localhost:4200 in your browser.

---

## Troubleshooting

**"You don't appear to be in a folder that is linked to a project"**  
Run this from the project root to re-link:
```bash
netlify link --id fa558d24-c63d-4abc-99e3-41562f9f9f15
```

**"netlify: command not found"**  
Reinstall the CLI:
```bash
npm install -g netlify-cli
```

**Not logged in**  
```bash
netlify login
```
A browser window will open — log in with your Netlify account.
