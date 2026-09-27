# Cloud sign-in setup (Supabase)

DATUM stays a static site on Netlify. Sign-in, cloud projects and sharing use [Supabase](https://supabase.com) directly from the browser.
Without the two settings in step 6 the app runs exactly as before, with no sign-in button.

## Who can do what

| Role | Default for | Can |
|---|---|---|
| Viewer | everyone who signs up | open projects shared with them, tick off markout rows, export PDFs |
| Editor | set by an admin | everything a viewer can, plus create cloud projects, edit them (auto-saved) and share them by email |
| Admin | you | everything an editor can, plus change people's roles in the app (**Cloud projects > Team**) |

- Sharing is by email address, so you can share with a crew member before they sign up. Shared people get view-only access.
- Done marks (ticks) are never uploaded. Each device keeps its own.
- The database enforces all of this (row level security in `supabase/schema.sql`), not just the app.

## One-time setup

1. **Create a project** at supabase.com. The free plan is enough. Pick a region near you, for example Sydney.
2. **Create the tables and rules.** Go to **SQL Editor > New query**, paste all of `supabase/schema.sql` and click **Run**. It is safe to run again after updates.
3. **Set the site address.** Go to **Authentication > URL Configuration**.
   - Set **Site URL** to your Netlify address, for example `https://your-site.netlify.app`.
   - Under **Redirect URLs**, add the same address. Add `http://localhost:8080` too if you test locally.
4. **Keep email confirmation on.** Under **Authentication > Sign In / Providers > Email**, leave **Confirm email** switched on. Shares are matched on email, so addresses must be verified.
5. **Google sign-in (optional).**
   1. In Google Cloud Console, go to **APIs & Services > Credentials** and create an **OAuth client ID** of type **Web application**.
   2. Under **Authorized redirect URIs**, add the callback URL that Supabase shows on its Google provider page. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
   3. Paste the client ID and secret into Supabase under **Authentication > Sign In / Providers > Google**, and enable it.
6. **Connect Netlify.** In Supabase, open **Project Settings > API** and copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` or secret key.
   1. In Netlify, go to **Site configuration > Environment variables** and add:
      - `SUPABASE_URL` = the project URL
      - `SUPABASE_ANON_KEY` = the anon / publishable key
   2. Redeploy the site. The build log should end with `cloud on (https://...supabase.co)`.
7. **Make yourself admin.** Sign up in the app and confirm your email. Then run this in the SQL Editor with your own email:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Reload the app. Your crew can now sign up, and you promote editors from **Cloud projects > Team**.

The anon / publishable key is meant to be public; the database rules are what protect the data. On the free plan, Supabase may pause a project after a period of no use. You can resume it from the Supabase dashboard.

## Using it

- **Save to cloud** (editors): open or import a project, then choose **Save to cloud...** in the side panel. From then on, changes save automatically. The header shows *Saved*, *Saving...* or *Offline - will sync*.
- **Share**: go to **Cloud projects > Share** and add crew email addresses.
- **Crew**: sign in, open **Cloud projects**, then open a project under **Shared with me**. It opens view only. When the owner saves a newer version, crew get it the next time they open the app.
- **Offline**: the last opened project stays on the device and works without signal. An editor's changes upload when the connection returns.
- Importing a CSV, opening a project file or starting a new project unlinks the cloud project. The cloud copy is untouched.

## Local testing

- Put the two values in `datum.config.json` (see `datum.config.example.json`), then run `npm run build`. The file is git-ignored.
- `supabase/test/rls_test.sql` checks the access rules on plain Postgres. Run `auth_stub.sql`, then `schema.sql`, then `rls_test.sql` against an empty database.
- `tests/cloud.test.mjs` drives the sign-in, projects and sharing screens against a stand-in Supabase client. See the comment at the top of the file for how to run it.
