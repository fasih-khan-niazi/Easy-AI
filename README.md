# EasyAI

EasyAI is an AI SaaS app for creating written content, images, and document reviews from one workspace.

Sign in with Clerk, pick a tool, and every generation is saved to your dashboard. Premium users can publish images to a community gallery.

## Features

- **Article writer:** Gemini writes short, medium, or long articles from a topic
- **Blog title generator:** keyword and category titles for posts
- **Image generation:** Stable Diffusion XL through Cloudflare Workers AI
- **Background removal:** Cloudinary image transformation
- **Object removal:** Cloudinary generative fill to drop one object from a photo
- **Resume review:** PDF parse plus Gemini feedback
- **Dashboard:** history of your creations, with plan status
- **Community:** public images and likes
- **Billing:** Clerk Free and Premium plans

## Architecture

Two apps in this repo:

| App | Stack | Port | Role |
|-----|--------|------|------|
| `frontend` | React 19, Vite, Tailwind CSS, Clerk | 5173 | Marketing site and signed-in workspace |
| `backend` | Node.js, Express 5, Clerk | 3000 | Auth, AI tools, creations API |

```
Browser  ->  Frontend (5173)  ->  Backend (3000)
                                      |
                      +---------------+---------------+
                      |               |               |
                    Neon          Gemini         Cloudinary
                 (creations)    (text/PDF)      (image store)
                                      |
                                Cloudflare AI
                              (image generation)
                                      |
                                    Clerk
                          (users, session, billing)
```

The browser talks only to the Express API. The API calls Gemini, Cloudflare, Cloudinary, Neon, and Clerk.

## Plans

| Plan | Access |
|------|--------|
| Free | Article writer and blog titles, 10 generations total |
| Premium | Unlimited text tools, plus images, cleanup, and resume review |

Clerk Billing must include a plan named `premium`. The UI uses Clerk `Protect` and `PricingTable`. The API checks `has({ plan: 'premium' })`.

## Quick start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Clerk](https://clerk.com) app with a `premium` plan
- API keys for Gemini, Cloudflare Workers AI, and Cloudinary

### 1. Environment files

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Fill in the values. `VITE_CLERK_PUBLISHABLE_KEY` on the frontend must match `CLERK_PUBLISHABLE_KEY` on the backend. `VITE_BASE_URL` should point at the API, usually `http://localhost:3000`.

### 2. Database

In the Neon SQL editor, run `backend/schema.sql`. That creates the `creations` table used by the dashboard and community.

### 3. Install and run

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
npm install
npm run server
```

Open `http://localhost:5173`. The API health check is `GET http://localhost:3000/`.

## Environment variables

### Frontend (`frontend/.env`)

| Name | Purpose |
|------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_BASE_URL` | Express API origin |

### Backend (`backend/.env`)

| Name | Purpose |
|------|---------|
| `PORT` | API port, defaults to 3000 |
| `DATABASE_URL` | Neon Postgres connection string |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GEMINI_API_KEY` | Google Gemini key (OpenAI-compatible client) |
| `CF_ACCOUNT_ID` | Cloudflare account id |
| `CF_API_TOKEN` | Cloudflare API token with Workers AI access |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Do not commit `.env` files. Examples are checked in as `.env.example`.

## Database schema

`creations` stores every generation:

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial | Primary key |
| `user_id` | text | Clerk user id |
| `prompt` | text | User prompt or action label |
| `content` | text | Markdown, image URL, or review text |
| `type` | text | `article`, `blog_title`, `image`, or `resume_review` |
| `publish` | boolean | Public community image when true |
| `likes` | text[] | Clerk user ids who liked the image |
| `created_at` | timestamptz | Insert time |
| `updated_at` | timestamptz | Last update |

## API

All routes except `GET /` require a Clerk session (`Authorization: Bearer <token>`).

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | Public | Health check |
| POST | `/api/ai/generate-article` | Free (10) / Premium | Write an article |
| POST | `/api/ai/generate-blog-title` | Free (10) / Premium | Generate titles |
| POST | `/api/ai/generate-image` | Premium | Generate an image |
| POST | `/api/ai/remove-image-background` | Premium | Remove background (`image` file) |
| POST | `/api/ai/remove-image-object` | Premium | Remove one object (`image` file + `object`) |
| POST | `/api/ai/resume-review` | Premium | Review a PDF (`resume` file, max 5MB) |
| GET | `/api/user/get-user-creations` | Signed in | Current user history |
| GET | `/api/user/get-published-creations` | Signed in | Public community images |
| POST | `/api/user/toggle-like-creation` | Signed in | Like or unlike an image |

## Scripts

**Frontend**

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview the build
```

**Backend**

```bash
npm run server   # Nodemon
npm start        # Node
```

## Project layout

```
frontend/          React client
  src/pages/       Landing, dashboard, and each AI tool
  src/components/  Navbar, sidebar, marketing sections
backend/           Express API
  configs/         Neon, Cloudinary, Multer, Gemini
  controllers/     AI tools and user creations
  middlewares/     Clerk plan and usage
  routes/          /api/ai and /api/user
  schema.sql       Neon table
```
