# Supabase setup checklist (production)

Three steps connect the deployed app at **https://financial-controller-theta.vercel.app** to Supabase.
Until they are done, the app still works, but signed-in users see "Not saved to your account"
and their data stays in their browser.

## 1. Create the app's tables (once)

1. In the Supabase dashboard: **Database → Backups**, confirm a recent backup exists (or download one).
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_finance_schema.sql`, and run it.
3. Expected result: "Success. No rows returned." It creates only `fc_profiles`, `fc_transactions`,
   `fc_cards`, `fc_loans`, `fc_budgets` and `fc_goals`. The existing `users`, `income`, `transactions`,
   `cards`, `budgets` and `goals` tables are not touched.
4. If it reports that Financial Controller tables already exist, stop: it has already been run. Do not run it again.

Check: **Table Editor** lists the six `fc_*` tables, each marked with RLS enabled.

## 2. Allow sign-in to return to the live site

**Authentication → URL Configuration**

- **Site URL:** `https://financial-controller-theta.vercel.app`
- **Redirect URLs:** add
  - `https://financial-controller-theta.vercel.app`
  - `https://financial-controller-theta.vercel.app/**`
  - `http://localhost:3000` (for local development)

**Authentication → Providers**

- **Email:** enabled (the app uses email codes and email + password).
- **Google** (optional): enabled with its client ID and secret. In Google Cloud Console the authorised
  redirect URI must be `https://<your-project-ref>.supabase.co/auth/v1/callback`.
- **GitHub** (optional): the `/auth` page has a GitHub button; it only works if this provider is enabled.

## 3. Check the Vercel environment variables

**Vercel → Project → Settings → Environment Variables** (Production):

- `NEXT_PUBLIC_SUPABASE_URL` = your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your publishable/anon key

If either is missing, the live `/auth` page says "Accounts are not set up here". After changing them,
redeploy (**Deployments → … → Redeploy**), because `NEXT_PUBLIC_*` values are built into the app.

## 4. Test on the live site (about 10 minutes)

1. Open the live site, sign up with your email and enter the code you receive.
2. Complete onboarding, add one expense and one card. The status line should read "Saved to your account".
3. Reload the page: the data is still there.
4. In a private window, sign up as a second user: they must see none of the first user's data.
5. Optional: sign in with Google and confirm you land back on the live site.

If saving fails, the status bar shows the error and a **Retry** button. The most common causes are
step 1 not done (tables missing) or step 3 not done (wrong project URL or key).
