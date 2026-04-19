# SkillMentor

Online mentoring platform: students browse mentors, book sessions, upload payment proof, and track progress; admins manage mentors, subjects, bookings, and payments.

## Features

- **Public mentor discovery** with profile pages (`/mentors/:id`), ratings, subjects, and enrollment counts.
- **Student flow**: schedule session → payment slip step → dashboard with session/payment status; **reviews** on completed sessions.
- **Admin dashboard** (`/admin/*`): role-gated (Clerk `publicMetadata.role === "admin"`), create subjects/mentors, manage all sessions (confirm payment, meeting link, mark complete).
- **Backend rules**: no double-booking (overlapping times for same student or mentor), subject must belong to mentor, session time cannot be in the past.

## Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React, TypeScript, Vite, Tailwind, shadcn/ui, Clerk |
| Backend  | Spring Boot, Spring Security (JWT via Clerk JWKS), JPA |
| Database | PostgreSQL (e.g. Supabase or local Docker) |

## Project structure

```
skill-mentor-ari/
├── frontend/          # Vite React app
├── backend/           # Spring Boot API
├── README.md
└── backend/docker-compose.yaml   # Optional local Postgres
```

## Local development

### 1. Database

Use Docker (optional):

```bash
cd backend
docker compose up -d db
```

Default in `application.properties` uses `jdbc:postgresql://localhost:5432/skillmentor` — adjust `SPRING_DATASOURCE_*` to match your DB (Supabase connection string, or Docker on port `5433` if you map it that way).

### 2. Backend

Copy `backend/env.example` into your environment variables if you override defaults. **`CLERK_JWKS_URL`** defaults in `application.properties` to this project’s Clerk dev JWKS; set the env var if you use a different Clerk instance.

**Do not confuse these URLs:**

| Name | Example | Used for |
|------|---------|----------|
| Clerk **Frontend API** / account host | `https://sensible-boa-35.clerk.accounts.dev` | Where Clerk hosts sign-in UI; not your Vite `VITE_API_BASE_URL` |
| Clerk **Backend API** | `https://api.clerk.com` | Clerk’s REST API (dashboard/server-side); SkillMentor Spring Boot does **not** need this for JWT login |
| **JWKS URL** | `https://sensible-boa-35.clerk.accounts.dev/.well-known/jwks.json` | Spring Boot verifies JWT signatures (see [JWKS](https://sensible-boa-35.clerk.accounts.dev/.well-known/jwks.json)) |
| **SkillMentor API** | `http://localhost:8081` | Set as `VITE_API_BASE_URL` in the frontend |

The PEM “JWKS public key” is the same key material exposed via JWKS; the app uses the **JWKS URL**, not the PEM file.

Start:

```bash
cd backend
./mvnw spring-boot:run
```

API default: `http://localhost:8081`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_CLERK_PUBLISHABLE_KEY, VITE_API_BASE_URL
npm install
npm run dev
```

### 4. Clerk setup — admin (Clerk only)

Admin is **not** stored in your Postgres database. You configure it **only in Clerk**:

1. **User public metadata** (Dashboard → **Users** → user → **Metadata** → **Public**).  
   **Recommended (one source of truth for UI + API):**

   ```json
   {
     "roles": ["ADMIN"]
   }
   ```

   Legacy: `{"role": "admin"}` still unlocks the **admin UI** only; the Spring API still needs `roles` in the JWT (below).

2. **JWT template** (Dashboard → **JWT templates** → create or edit **`skillmentor-auth`**, the same name used in `getToken({ template: "skillmentor-auth" })`).  
   Add claims so the token includes **`roles`** from the same metadata Spring expects (`ROLE_ADMIN` ← claim value `ADMIN`):

   ```json
   {
     "email": "{{user.primary_email_address}}",
     "first_name": "{{user.first_name}}",
     "last_name": "{{user.last_name}}",
     "roles": {{user.public_metadata.roles}}
   }
   ```

   If `public_metadata.roles` is missing, Clerk may emit invalid JSON — ensure every user has `roles` set (e.g. `[]`) or adjust the template with Clerk’s defaulting rules.

3. **`CLERK_JWKS_URL`** on the backend must match the Clerk instance that **signs** this template (see [Clerk JWT templates](https://clerk.com/docs/backend-requests/making/jwt-templates)).

After changing metadata, the user should **sign out and sign in again** (or refresh the session) so new tokens include the updated `roles` claim.

## Environment variables

### Backend (`backend/env.example`)

| Variable | Purpose |
|----------|---------|
| `CLERK_JWKS_URL` | Clerk JWKS endpoint for verifying JWTs (**required**) |
| `SPRING_DATASOURCE_URL` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | DB credentials |
| `PORT` | HTTP port (default `8081`) |
| `JPA_DDL_AUTO` | Hibernate mode (default `update`; use `create-drop` only for throwaway DBs) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins |

### Frontend (`frontend/.env.example`)

| Variable | Purpose |
|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_API_BASE_URL` | Backend base URL (no trailing slash) |

## API highlights

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/mentors` | No | Paged mentors |
| GET | `/api/v1/mentors/{id}` | No | Mentor entity |
| GET | `/api/v1/mentors/{id}/profile` | No | Profile + subjects + reviews + stats |
| POST | `/api/v1/sessions/enroll` | Yes | Book session (validates overlap, past time, subject–mentor) |
| GET | `/api/v1/sessions/my-sessions` | Yes | Student’s sessions |
| POST | `/api/v1/sessions/{id}/review` | Yes | Submit review (completed sessions) |
| GET | `/api/v1/sessions` | Admin | All sessions (admin table) |
| PATCH | `/api/v1/sessions/{id}/confirm-payment` | Admin | Confirm payment |
| PATCH | `/api/v1/sessions/{id}/complete` | Admin | Mark completed |
| PATCH | `/api/v1/sessions/{id}/meeting-link` | Admin | Body: `{"meetingLink":"..."}` |
| POST | `/api/v1/subjects` | Admin | Create subject |
| POST | `/api/v1/mentors` | Yes (admin) | Create mentor (send `mentorId` = Clerk user id) |

Swagger UI (when enabled): `/swagger-ui.html` (see `SecurityConfig` permit list).

## Deployment

- **Frontend**: Vercel — set `VITE_*` env vars; configure SPA fallback so client routes work on refresh.
- **Backend**: Render/Railway — set `PORT`, `SPRING_DATASOURCE_*`, `CLERK_JWKS_URL`, `CORS_ALLOWED_ORIGINS` to your Vercel URL.
- **Database**: Supabase PostgreSQL — use the pooled connection string with SSL as required.

## License

Project for coursework / portfolio use.
