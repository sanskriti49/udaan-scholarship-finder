# Udaan Scholarship Finder: Deployment Guide (Vercel vs. Render)

This guide details the exact production deployment architecture for Udaan, covering what goes where and why.

---

## Architecture Summary: What to Deploy Where

```
+---------------------------------------------------------------------------------+
|                                 ARCHITECTURE                                    |
+---------------------------------------------------------------------------------+
|  [Vercel]               --> Frontend SPA (Vite + React 19)                      |
|                             Global Edge CDN, automatic SSL, fast routing        |
+---------------------------------------------------------------------------------+
|  [Render Web Service]   --> Backend API (Express.js)                            |
|                             Persistent 24/7 process for HTTP, crawlers, BullMQ   |
+---------------------------------------------------------------------------------+
|  [Render / Upstash]     --> Redis Instance                                      |
|                             In-memory cache + BullMQ queue data store           |
+---------------------------------------------------------------------------------+
|  [MongoDB Atlas]        --> Primary Database                                    |
|                             Mongoose models: Users, Scholarships, Notifications |
+---------------------------------------------------------------------------------+
```

### Why Vercel for Frontend?
- Vite + React compiles into static HTML, JavaScript, and CSS.
- Vercel distributes these static files across a worldwide edge CDN with instant cache invalidation, sub-50ms asset delivery, and free custom domains with SSL.
- Vercel gives automated preview URLs for every Git branch and pull request.

### Why Render for Backend (and NOT Vercel)?
- **Persistent Crawlers & Schedulers**: Udaan runs background ingestion schedules (`setInterval`) and Cheerio/Playwright web scrapers. Serverless platforms like Vercel freeze CPU execution as soon as an HTTP response finishes and kill executions after 10 to 15 seconds.
- **BullMQ Workers**: BullMQ workers require an active event loop and open Redis TCP connection to listen for delayed jobs and process reminders. Render Web Services and Background Workers remain online 24/7 without timing out.
- **WebSocket / Long Polling**: Render supports persistent connections without artificial timeouts.

---

## 1. Deploying Frontend to Vercel

### Step 1: Push Repository to GitHub
Ensure your latest changes are pushed to your GitHub repository:
```bash
git push origin main
```

### Step 2: Import Project in Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Select your GitHub repository (`udaan-scholarship-finder`).
4. In the configuration screen:
   - **Root Directory**: Click edit and select `frontend`.
   - **Framework Preset**: Vite (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables in Vercel
Add the following under **Settings** > **Environment Variables**:
- `VITE_API_URL`: Your Render backend URL (e.g. `https://udaan-api.onrender.com/api`)
- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID (if enabled)
- `VITE_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key (if enabled)

### Step 4: Deploy
Click **Deploy**. Vercel will build and launch your application at a `*.vercel.app` domain.

---

## 2. Deploying Backend to Render

### Step 1: Create a Redis Instance on Render (or Upstash)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Redis**.
2. Name: `udaan-redis`.
3. Plan: Free or Starter.
4. Once provisioned, copy the **Internal Redis URL** (e.g. `redis://red-xxxx:6379`).
*(Alternatively, you can create a free Redis database at [Upstash](https://upstash.com) and copy the `rediss://...` connection string).*

### Step 2: Create a Web Service on Render
1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. In the setup form:
   - **Name**: `udaan-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Starter or Free

### Step 3: Add Backend Environment Variables on Render
Under the **Environment** tab, add:
- `PORT`: `5000`
- `NODE_ENV`: `production`
- `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://udaan.vercel.app`)
- `MONGO_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/udaan`)
- `JWT_SECRET`: A secure 32+ character secret key
- `REDIS_URL`: The Redis connection URL from Step 1
- `CACHE_TTL_SECONDS`: `1800`
- `ENABLE_BULLMQ_WORKER`: `true` (runs worker inside the web service)
- `SMTP_HOST`: (Optional) Your SMTP provider, e.g., `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: (Optional) Your SMTP email address
- `SMTP_PASS`: (Optional) Your SMTP app password

### Step 4: Deploy Service
Click **Create Web Service**. Render will install dependencies, connect to MongoDB and Redis, and start the API with BullMQ and crawlers.

---

## 3. Worker Strategy: Single-Process vs. Separate Background Worker

### Option A: Co-located Single Process (Recommended for Startups / Free & Starter Tiers)
- The backend starts the Express server, scheduler, and BullMQ worker together in `server.js` (`ENABLE_BULLMQ_WORKER=true`).
- **Advantage**: Zero extra infrastructure cost. One single Render instance runs everything.

### Option B: Dedicated Background Worker (For High Scale)
- When traffic grows to tens of thousands of users, create a separate **Background Worker** on Render:
  - **Start Command**: `node src/workers/reminderWorker.js`
  - In the main Web Service, set `ENABLE_BULLMQ_WORKER=false`.
- **Advantage**: CPU-heavy crawler tasks and bulk email dispatches never compete with HTTP requests for CPU cycles.

---

## 4. Verification & Health Checklist

After deployment, verify each layer:
1. **API Health**: Visit `https://your-backend.onrender.com/` and confirm response is `Backend running...`.
2. **Redis Cache Header**:
   - Make a GET request: `curl -i https://your-backend.onrender.com/api/scholarships`
   - First call should return header: `X-Cache: MISS`
   - Second call should return header: `X-Cache: HIT` (served in under 5ms).
3. **Fail-Open Resilience**: If Redis goes down, requests return `X-Cache: BYPASS` and fetch directly from MongoDB without error.
4. **BullMQ Worker**: Open **Settings** on the frontend, click **Send Test Alert**, and verify the notification appears in the top navigation bell.
