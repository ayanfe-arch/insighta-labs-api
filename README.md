# Insighta Labs+ Backend

A secure, multi-interface profile intelligence platform.

## Live URL
https://insighta-labs-api-production.up.railway.app

## System Architecture
- Backend: Node.js + Express + MongoDB (deployed on Railway)
- CLI: Commander.js (runs locally)
- Web Portal: (separate repo)

## Authentication Flow
1. User visits `/auth/github` → redirected to GitHub OAuth
2. GitHub redirects to `/auth/github/callback` with code
3. Backend exchanges code for GitHub access token
4. Backend fetches user info from GitHub
5. Backend creates/updates user in MongoDB
6. Backend issues JWT access token (3min) + refresh token (5min)
7. Tokens returned as HTTP-only cookies (web) or JSON (CLI)

## CLI Usage
```bash
npm install -g insighta-cli

insighta login
insighta whoami
insighta profiles list
insighta profiles list --gender male --country NG
insighta profiles list --sort-by age --order desc
insighta profiles get <id>
insighta profiles search "young males from nigeria"
insighta profiles create --name "Harriet Tubman"
insighta profiles export --format csv
```

## Token Handling
- Access token expires in 3 minutes
- Refresh token expires in 5 minutes
- CLI auto-refreshes token on 401 responses
- Old refresh token invalidated immediately after use

## Role Enforcement
- `admin` — full access: create, delete, read, search
- `analyst` — read only: list, search, get profiles
- Default role on signup: analyst
- All `/api/*` endpoints require authentication
- Role checked via middleware before reaching controllers

## Natural Language Search
- `GET /api/profiles/search?q=young males from nigeria`
- Parses query for gender, age group, country keywords
- Returns matching profiles

## API Versioning
All profile endpoints require header:
X-API-Version: 1

## Environment Variables
GITHUB_CLIENT_ID= Ov23liU08CN0banHm5aH
GITHUB_CLIENT_SECRET= 9793e05cf08842dc394bb0e0bf929a7001a18bac
GITHUB_CALLBACK_URL= https://insighta-labs-api-production.up.railway.app/auth/github/callback
JWT_SECRET= insightalabs_super_secret_key_2026
MONGO_URI= mongodb+srv://ayanfe123ayanfe_db_user:ayanfe123@cluster0.qghb1z7.mongodb.net/?appName=Cluster0
APP_URL= https://insighta-labs-api-production.up.railway.app
PORT= 3000

## Rate Limiting
- `/auth/*` — 10 requests/minute
- `/api/*` — 60 requests/minute per user

## Repositories
- Backend: https://github.com/ayanfe-arch/insighta-labs-api
- CLI: https://github.com/ayanfe-arch/insighta-cli