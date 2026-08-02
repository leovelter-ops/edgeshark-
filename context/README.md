# Project Context — edgeflo-clone

This folder holds ground-truth context for building this app. Read before doing work.

## What this project is
A clone of **Edgeflo** (the app we are copying). We copy Edgeflo completely **except for the charts**.

## ⛔ HARD BOUNDARY — Supabase
- The Supabase project `tshigipmvrvzopasgqak.supabase.co` belongs to a **different** app
  (**Satellite Home Watch**). It has NOTHING to do with this project.
- **NEVER** touch, read, migrate, query, or modify that Supabase project from this project. Ever.
- This app will get its **own separate Supabase project** (TBD — link to be added here).

## Sources
- Edgeflo = a real third-party web app (NOT ours, no source access). We **rebuild** its
  functionality/UX from screenshots the owner provides — original code only, no verbatim
  copying of Edgeflo's code, branding, name, logos, or text. Charts are excluded.
- This app's GitHub repo (to push to): `https://github.com/leovelter-ops/edgeshark-.git` (connected as `origin`)
- This app's own Supabase project: `https://ncaodaxcotuhsypigmwl.supabase.co` (ref `ncaodaxcotuhsypigmwl`)
  - On a **separate Supabase account** from the MCP tool → the MCP cannot reach it (this is intentional/safe).
  - App connects app-level via `.env.local` (anon key). Schema changes = SQL handed to owner
    to run in that project's SQL editor. Confirmed reachable (auth health 200).

## Stack
- Next.js (App Router) + TypeScript + Tailwind + ESLint, `src/` dir, import alias `@/*`.
- `@supabase/supabase-js` + `@supabase/ssr`.
- Supabase clients: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server).

## Git / GitHub accounts (IMPORTANT — two accounts on this machine)
- This repo pushes ONLY as **`leovelter-ops`**. Enforced repo-locally:
  - remote: `https://leovelter-ops@github.com/leovelter-ops/edgeshark-.git`
  - `git config credential.username leovelter-ops`
- **`SatelliteHomeGroup-ops`** is the GLOBAL credential — belongs to the Satellite app only.
  Never push this project as that account; never disconnect it (satellite work is ongoing).

## Status
- Scaffolded + pushed to `main`. Awaiting screenshots to build screen-by-screen.
