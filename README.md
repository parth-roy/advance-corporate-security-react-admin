# advance-corporate-security-react-admin

Internal enterprise administration dashboard for **Advance Corporate Security**, built with TanStack Start, React, Vite, Nitro, and Tailwind CSS.

## Prerequisites

- Node.js >= 22.12.0
- npm

## Development

```sh
npm install
npm run dev
```

App runs locally at `http://localhost:7967`.

## Scripts

- `npm run dev` — Start the Vite development server on port `7967`
- `npm run build` — Build for production (`.output/`)
- `npm run preview` — Preview the production build on port `7967`
- `npm start` — Run the built Nitro server (`node .output/server/index.mjs`)
- `npm test` — Run unit tests with Vitest
- `npm run lint` — Run ESLint
- `npm run format` — Format files with Prettier

## Production Deployment

Hosted at `https://admin.advancecorporatesecurity.com` on the shared ACS DigitalOcean Droplet (port `7967` via PM2 + Nginx). See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for DNS, Nginx, SSL, PM2, and GitHub Actions setup.
