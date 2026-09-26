This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Tests

Use Node 24 (see `.nvmrc`), then run:

```bash
nvm install
nvm use
npm ci
npm test
npm run typecheck
```

Tests use Vitest with TypeScript, `expect` assertions and `vi.mock` for database,
Clerk, OpenAI and email services. No credentials or live services are required.
Use `npm run test:watch` during development. Type checking runs separately.

The suite covers dashboard calculations and monthly report processing. It does
not render React components or exercise browser interactions. Add test files as
`tests/**/*.test.ts`; Vitest discovers them automatically. Shared transaction
fixtures live in `tests/fixtures.ts`.

GitHub Actions runs tests and type checking on pushes and pull requests.
`npm run build` runs tests before `next build`, and `vercel.json` explicitly uses
that command, so a failed test prevents deployment through this build path.
GitHub branch protection is a separate repository setting; this workflow alone
does not make its status check mandatory for merging.

Dependency install scripts are explicitly approved for reviewed versions in
`package.json` (`allowScripts`). After updating a dependency with an install
script, review it with `npm install-scripts ls` and approve the specific package
with `npm install-scripts approve <package>`. Keep approvals version-pinned.
