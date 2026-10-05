This is a [Next.js](https://nextjs.org) project bootstrapped with [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses `next/font` for optimized font loading.

## RESA production release

The web application is released from the `main` branch. RESA browser API traffic is routed through the same-origin `/api/resa/*` bridge, while the NestJS API remains an isolated backend service. This keeps the browser contract stable and avoids making the separate backend hostname a frontend dependency.

## Learn More

To learn more about Next.js, take a look at the [Next.js Documentation](https://nextjs.org/docs).

## Deploy on Vercel

The production web project is connected to the `Edgar's projects` Vercel team and deploys from the repository's `main` branch.
