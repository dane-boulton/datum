# DATUM cloud setup (Supabase + Netlify)

Once this is set up, nobody can use DATUM without signing in, and only people you invite can create an account.
The app stays on Netlify. Sign-in and project storage use [Supabase](https://supabase.com), which is free for a team your size.

**Admin:** dane@vektorprojects.com (already set up as admin in `supabase/schema.sql`)

## How access works

| Role | Can |
|---|---|
| **Viewer** | Sign in, open projects shared with them, tick off markout rows and export PDFs. Viewers cannot import, edit or create projects. |
| **Editor** | Everything a viewer can do, plus import CSVs, create and edit projects, save them to the cloud and share them. |
| **Admin** (you) | Everything an editor can do, plus invite people, change roles and remove access, from **Cloud projects > Team**. |

- **Invite only:** an account can only be created for an email address you have invited. This applies to email and password sign-up and to Google sign-in.
- **First sign-in:** invited people choose **First time? Set up your account** and pick a password, or use **Continue with Google**. After that they just sign in.
- **Sharing:** editors share a project by email address. The people they share with get view-only access.
- **Done marks:** ticks are never uploaded. Each phone or computer keeps its own.
- **Where the rules live:** the database enforces all of the above, not just the app. The app page is public like any website, but without an invited, signed-in account it shows nothing and can read no data.

---

## Part 1: Create the Supabase project (about 10 minutes)

1. Go to **supabase.com**, sign up and click **New project**.
   - **Name:** `DATUM`
   - **Database password:** generate one and keep it somewhere safe. The app doesn't need it.
   - **Region:** Asia-Pacific (Sydney)
   - Click **Create new project** and wait about a minute.
2. **Create the tables and rules.** In the left menu open **SQL Editor**, click **New query**, paste the whole of `supabase/schema.sql`, then click **Run**. It should end with "Success. No rows returned".
3. **Set the site address.** Open **Authentication > URL Configuration**.
   - **Site URL:** your Netlify address, for example `https://datum-markout.netlify.app`
   - **Redirect URLs:** click **Add URL** and add the same address.
4. **Sign-in settings.** Open **Authentication > Sign In / Providers**.
   - **Allow new users to sign up:** leave this **ON**. The database refuses anyone you have not invited, and this is how invited people create their password.
   - Under **Email**, keep **Confirm email** **ON**. Sharing is by email address, so addresses must be proven.
   - Set the **minimum password length** to 8, to match the app.
5. **Copy the connection details.** Open **Project Settings > API Keys** (on older dashboards, **Project Settings > API**) and copy:
   - the **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - the **anon** or **publishable** key.

   Never use the **service_role** or **secret** key anywhere in DATUM.

## Part 2: Google sign-in (optional, about 10 minutes)

1. Go to **console.cloud.google.com** and create a project called `DATUM`.
2. Open **APIs & Services > OAuth consent screen** (on newer consoles, **Google Auth Platform > Branding**).
   - **App name:** DATUM
   - **User support email:** your email
   - **Audience / user type:** **External**
   - Save.
3. Open **APIs & Services > Credentials > Create credentials > OAuth client ID**.
   - **Application type:** **Web application**
   - **Authorized JavaScript origins:** your Netlify address
   - **Authorized redirect URIs:** the **Callback URL** shown in Supabase under **Authentication > Sign In / Providers > Google**. It looks like `https://abcdefgh.supabase.co/auth/v1/callback`.
   - Click **Create** and copy the **Client ID** and **Client secret**.
4. Back in Supabase, open **Authentication > Sign In / Providers > Google**, turn it **on**, paste the Client ID and secret, and click **Save**.
5. If Google shows the consent screen as "Testing", either click **Publish app**, or add each crew member's Google address as a test user.

Google sign-in follows the same invite rule: an uninvited Google account is turned away with a message saying so.

## Part 3: Connect Netlify (about 5 minutes)

1. In Netlify, open your site, then **Site configuration > Environment variables > Add a variable**, and add:
   - `SUPABASE_URL` = the Project URL from Part 1, step 5
   - `SUPABASE_ANON_KEY` = the anon / publishable key from Part 1, step 5
2. Open **Deploys > Trigger deploy > Deploy site**. When it finishes, the deploy log should include `cloud on (https://abcdefgh.supabase.co)`.
3. Open the site. You should see the **Sign in** screen instead of the app.

## Part 4: First sign-in and inviting your crew

1. On the sign-in screen, choose **First time? Set up your account**. Enter **dane@vektorprojects.com**, choose a password and click **Create my account**. Or click **Continue with Google** if that address is a Google account.
2. Open the confirmation email from Supabase, click the link, then sign in. You are the admin.
3. To invite someone, click the **person icon** (top right), then **Team**. Enter their email, choose **Viewer** or **Editor**, and click **Invite**.
4. Click **Email invite** next to their name. It opens your mail app with the sign-up steps already written. The app can't send the invite itself, so this step is what tells them.
5. Once they have set up their account, they move from **Invited, not signed up yet** to **People**. You can change their role there at any time, or click **Remove access**.

## Day to day

- **Editors:** import a CSV, then **Save to cloud...** in the side panel. From then on changes save automatically. The top bar shows **Saved**, **Saving...** or **Offline - will sync**. To share, go to **person icon > Share**.
- **Viewers:** after signing in they see **Shared with me**. Projects open view only. When the owner saves a newer version, crew get it the next time they open the app.
- **Offline:** once signed in, the app and the last opened project keep working without signal. An editor's changes upload when the connection comes back.
- **Shared devices:** when a different person signs in on the same device, the screen is cleared for them.
- **Forgot password:** use the **Forgot password?** link on the sign-in screen.
- **Free plan:** Supabase may pause a free project after about a week with no use. Open the Supabase dashboard and click **Restore** if the app says it can't reach the cloud.

## If the admin changes

Run this in the Supabase SQL Editor, using the new person's email. They must have been invited and have signed up first.

```sql
update public.profiles set role = 'admin' where email = 'new.admin@example.com';
```

## For developers

- **Local build:** put the two values in `datum.config.json` (copy `datum.config.example.json`) and run `npm run build`. The file is git-ignored. Without the values, the app builds with no sign-in screen, which is handy for local work.
- **Access rules test:** `supabase/test/rls_test.sql` checks the rules on plain Postgres. Run `supabase/test/auth_stub.sql`, then `supabase/schema.sql`, then the test, against an empty database.
- **App screens test:** `tests/cloud.test.mjs` drives the sign-in wall, invites, roles, projects and sharing against a stand-in Supabase client (`tests/mock-supabase.js`).
