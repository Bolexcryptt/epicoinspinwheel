# Vercel backend setup

This project uses Vercel Node.js 22+ functions, Supabase Postgres, and Resend. Run [`supabase/schema.sql`](./supabase/schema.sql) once in the Supabase SQL Editor before deploying the API.

## Vercel environment variables

Add these variables in Vercel Project Settings → Environment Variables for each environment you deploy:

- `SUPABASE_URL`: Project URL from Supabase Project Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key from Supabase Project Settings → API Keys. This is a secret and must only be used by the Vercel server functions. Never add it to browser code.
- `SESSION_SECRET`: random secret of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: sender on a domain verified by Resend, for example `Lucky Wheels <spins@example.com>`.
- `ADMIN_NOTIFICATION_EMAIL`: destination for spin notification emails.

Then redeploy the Vercel project. `SUPABASE_ANON_KEY` is not required; the server uses only the service-role key. Do not commit actual environment values. For local Vercel development, copy `.env.example` to `.env.local`, fill in the values, then run `npm install` and `vercel dev`.

If a service-role key has ever been placed in a source file or shared publicly, rotate it in Supabase and update `SUPABASE_SERVICE_ROLE_KEY` in Vercel before redeploying.

## Spin and wallet-claim behavior

`POST /api/spin` chooses prizes on the server using Node's cryptographic random generator, stores a unique spin ID and UTC timestamp in Supabase, and enforces the existing 30-second cooldown against a signed HttpOnly session cookie. Spin requests are idempotent, so a retry returns the originally generated prize.

The existing game flow allows spinning before submitting player details. Such spins are stored as `pending`. Once details are submitted, that spin is linked to the wallet and becomes `claimed`. A Supabase unique index enforces at most one claimed spin per wallet per UTC calendar day; subsequent spins made with that saved wallet are rejected for the rest of that UTC day. If several pending spins were made before submitting a wallet, only one spin for a given wallet/day can be claimed; other same-day spins remain unclaimed.

Because the first spin is granted before the server knows the wallet, no backend can guarantee one result per wallet/day for those anonymous pending spins without changing the flow to collect and cryptographically verify the wallet before spinning. The SQL constraint does enforce one wallet-linked, claimed spin per UTC day. The signed browser-session cookie and local wallet field are not proof of wallet ownership; a determined attacker can clear cookies or submit someone else's address. Wallet-signature authentication would be needed for stronger identity enforcement.

Player details and spin records are kept in Supabase. The server balance is computed from claimed spin rows, while pending spins are session-scoped until linked to a wallet. Resend notifications include the wallet, prize, UTC time, and spin ID. If email delivery fails, the spin remains recorded and the API reports the email failure.

## Database SQL

The full schema and atomic cooldown RPC are in [`supabase/schema.sql`](./supabase/schema.sql). Paste and run that file once in Supabase SQL Editor. It creates:

- `spin_sessions` for the server-enforced browser cooldown.
- `spins` for the spin ID, wallet, prize, UTC time, player details, claim state, and notification state.
- A unique partial index limiting claimed spins to one per wallet per UTC date.
- A restricted RPC used to reserve a session spin atomically.

Do not expose the service-role key to the browser. The tables have RLS enabled with no `anon` or `authenticated` policies; only the server-side service role is granted access.
