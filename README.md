# Alpha Computers Nanyuki

Online shop and back office in **one Next.js project**. The storefront, the admin pages and the API (`/api/*`) all deploy together to Vercel. There is no separate API server.

## Run it on your computer

1. Install Node 22 or newer and Docker Desktop.
2. `npm install`
3. `copy .env.example .env`, then set `JWT_SECRET` to a random string of 32+ characters:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. `docker compose up -d` starts PostgreSQL.
5. `npm run db:deploy` creates the tables, then `npm run db:seed` adds the first admin and inventory accounts and sample products. Leave a seed password empty and a random one is printed once.
6. `npm run dev` and open http://localhost:3000. Staff sign in at `/admin/login`.

## Put it on Vercel

1. Push the repository and import it in Vercel. The framework is detected as Next.js.
2. Add a Postgres database from the Vercel Marketplace (for example Neon). Set:
   - `DATABASE_URL` to the pooled connection string
   - `DIRECT_URL` to the unpooled connection string (on Neon this is `DATABASE_URL_UNPOOLED`)
3. Add a Blob store to the project. This sets `BLOB_READ_WRITE_TOKEN`, which product photo uploads need.
4. Set `JWT_SECRET`, `STORE_URL` and `NEXT_PUBLIC_SITE_URL` (your public address). Every variable is listed in `.env.example`.
5. Create the tables once from your computer, with the production values in your environment:
   `npm run db:deploy` then `npm run db:seed`.
6. Deploy.

Email, WhatsApp and the M-Pesa prompt only work once their keys are set. Customers can still pay by paybill or till and enter the M-Pesa code without any keys.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the site and API locally |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Check the code |
| `npm test` | Unit tests |
| `npm run test:e2e` | Order, inventory and refund checks against a running server (needs a seeded database) |
| `npm run db:migrate` | Create a new migration while developing |
| `npm run db:deploy` | Apply migrations |
| `npm run db:studio` | Browse the database |

## Where things are

- `src/app` pages and the single API entry, `src/app/api/[...path]/route.ts`
- `src/server` the API: `routes/` (endpoints), `services/` (business rules), `auth.ts`, `dto.ts` (input checks)
- `src/views`, `src/components` the screens
- `prisma` schema, migrations and seed
