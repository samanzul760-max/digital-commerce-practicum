# LearnEC Single-Port And Profile Design

## Goal

Run the real Digital Commerce Practicum Nuxt application at `http://127.0.0.1:4310`, using its own Nitro APIs, Prisma client, and PostgreSQL database. The lightweight Open Design `learnec-local` preview is not part of this runtime.

## Runtime Boundary

- The real application is `C:\Users\29053\Desktop\智能体\数字商贸实训工作台`.
- Nuxt serves both UI routes and `/api/*` from port `4310`.
- PostgreSQL remains an internal Docker dependency on `127.0.0.1:55432`; it is not a frontend port.
- Existing services on port `3000` are stopped only after the real application is healthy on `4310`.
- No source directory, database volume, migration, or unrelated user change is removed.

## Data And Security

- UI data continues to use the existing authenticated `/api/practicum/*` endpoints and Prisma persistence.
- Profile changes use a new authenticated, CSRF-protected API. The server validates a non-empty display name and updates the authoritative account record before returning the public session user.
- The topbar menu contains profile viewing, profile editing, authorized-role switching, and logout.
- Role switching only calls the existing server-side authorization endpoint. It never treats browser state as permission.

## Verification

- Add an API and Playwright contract for profile persistence, current-session rendering, authorized role switching, and logout.
- Verify the application at `4310`, database reachability, mobile width, typecheck, and production build.
- Stop the obsolete `3000` frontend service only after these checks pass.
