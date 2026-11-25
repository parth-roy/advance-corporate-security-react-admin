## Project Architecture
- **Prototype state**: All 9 ACS Admin Panel modules share a client-side context store (`src/lib/acs-store.tsx`) hydrated in `useEffect` from `localStorage` with initial seed data in `src/lib/acs-seed.ts`; this keeps SSR hydration safe while preserving edits across reloads until a real backend is added.
- **Module scope**: Only the 9 approved routes (`/`, `/recruitment`, `/uniforms`, `/attendance`, `/esi-pf`, `/salary`, `/payslips`, `/billing`, `/settings`) live under `src/routes/`, wrapped by the shared collapsible `AppShell` in `src/routes/__root.tsx`.
- **Semantic tokens**: Status badges and surfaces read exclusively from semantic OKLCH CSS tokens in `src/styles.css` and `Badge` variants rather than hardcoded color utilities.
