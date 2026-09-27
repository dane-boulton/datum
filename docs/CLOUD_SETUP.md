# DATUM cloud setup (Supabase + Netlify + Google Workspace)

Once this is set up:
- **Sign-in only:** nobody can use DATUM without signing in.
- **Invite only:** only people you invite can create an account.
- **Invites by email:** each invite arrives from **DATUM &lt;datum@vektorprojects.com&gt;**.

The app stays on Netlify. Sign-in and project storage use [Supabase](https://supabase.com), and emails go out through your Google Workspace account. Everything here fits in free plans at crew scale.

**Admin:** dane@vektorprojects.com (already set as admin in `supabase/schema.sql`)

## How access works

| Role | Can |
|---|---|
| **Viewer** | Sign in, open projects shared with them, tick off markout rows and export PDFs. Viewers cannot import, edit or create projects. |
| **Editor** | Everything a viewer can do, plus import CSVs, create and edit projects, save them to the cloud and share them. |
| **Admin** (you) | Everything an editor can do, plus invite people, change roles and remove access, from **Cloud projects > Team**. |

- **Inviting:** you invite someone from the Team screen and they get an email. The link in it signs them in and asks them to choose a password; Google users can skip that step. After that they sign in normally.
- **Uninvited people:** a person you have not invited cannot create an account, with email or with Google.
- **Sharing:** editors share projects by email address. The people they share with get view-only access.
- **Done marks:** ticks are never uploaded. Each device keeps its own.
- **Where the rules live:** the database enforces all of the above. The app page is public like any website, but without an invited, signed-in account it shows only the sign-in screen and can read no data.

---

## Part 1: Supabase project (about 10 minutes)

1. Go to **supabase.com**, sign up and click **New project**.
   - **Name:** `DATUM`
   - **Database password:** generate one and keep it safe. The app doesn't need it.
   - **Region:** Asia-Pacific (Sydney)
   - Click **Create new project** and wait about a minute.
2. **Create the tables and rules.** Open **SQL Editor > New query**, paste the whole of `supabase/schema.sql` and click **Run**. It should end with "Success. No rows returned". The script is safe to run again whenever it is updated.
3. **Set the site address.** Open **Authentication > URL Configuration**.
   - **Site URL:** your Netlify address, for example `https://datum-markout.netlify.app`
   - **Redirect URLs:** click **Add URL** and add the same address.
4. **Sign-in settings.** Open **Authentication > Sign In / Providers**.
   - **Allow new users to sign up:** leave this **ON**. The database turns away anyone not invited.
   - **Email > Confirm email:** leave this **ON**.
   - **Minimum password length:** 8.
5. **Copy the keys.** Open **Project Settings > API Keys**. You need three values:
   - the **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - the **publishable** key, or the **anon** key under "Legacy API keys". This one goes in the web page and is safe to be public.
   - the **secret** key, or the **service_role** key under "Legacy API keys". This one is **private**. It only goes into Netlify in Part 4, where only the invite function can read it. Never paste it anywhere else.

## Part 2: Send email from datum@vektorprojects.com (about 15 minutes)

Supabase's built-in email is for testing only: it sends to very few addresses and only a few emails an hour. This part makes every DATUM email (invites, confirmations, password resets) come from your own domain through Gmail.

1. **Create the address.** In the **Google Admin console** (admin.google.com), go to **Directory > Users**, click your user, then **User information > Alternate email addresses (email alias)**. Add `datum` and save. Mail to datum@vektorprojects.com now lands in your inbox. It can take a few minutes to start working.
2. **Let Gmail send as it.** In **Gmail**, click the gear, then **See all settings > Accounts > Send mail as > Add another email address**.
   - **Name:** `DATUM`
   - **Email:** `datum@vektorprojects.com`
   - Tick **Treat as an alias**, then **Next step**. Because it is an alias of your own account, Google may add it straight away or send a code to your inbox to confirm.
3. **Create an app password.** Go to **myaccount.google.com > Security**.
   1. Make sure **2-Step Verification** is on.
   2. Search for **App passwords**, create one named `DATUM Supabase`, and copy the 16-character password.
   3. If App passwords is missing, open the Admin console and go to **Security > Authentication > 2-Step Verification**, and make sure users can turn it on. App passwords only appear once 2-Step Verification is on.
4. **Point Supabase at Gmail.** In Supabase, open **Authentication > Emails > SMTP Settings** and turn on **Enable custom SMTP**.
   - **Sender email:** `datum@vektorprojects.com`
   - **Sender name:** `DATUM`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465`
   - **Username:** `dane@vektorprojects.com`
   - **Password:** the 16-character app password, without spaces
   - Click **Save**.
5. **Raise the sending limit.** In Supabase, open **Authentication > Rate Limits** and raise **Rate limit for sending emails** to about 30 per hour.
6. **Stop emails landing in spam.** In the Admin console, go to **Apps > Google Workspace > Gmail > Authenticate email**. If DKIM shows "Not authenticating email", click **Generate new record**, add the TXT record it shows to your domain's DNS, then click **Start authentication**.
7. **Word the invite email (optional).** In Supabase, open **Authentication > Emails > Templates > Invite user**. For example:
   - **Subject:** `You're invited to DATUM`
   - **Body:**
     ```html
     <h2>You're invited to DATUM</h2>
     <p>Dane has invited you to DATUM, the production markout tool.</p>
     <p><a href="{{ .ConfirmationURL }}">Accept the invite</a>. You'll choose a password, and can sign in with Google instead if this is a Google account.</p>
     ```

   Keep `{{ .ConfirmationURL }}` exactly as written. You can adjust **Confirm signup** and **Reset password** the same way.

## Part 3: Google sign-in (optional, about 10 minutes)

1. Go to **console.cloud.google.com** and create a project called `DATUM`.
2. Open **APIs & Services > OAuth consent screen** (on newer consoles, **Google Auth Platform > Branding**).
   - **App name:** DATUM
   - **Support email:** yours
   - **Audience:** **External**
   - Save.
3. Open **APIs & Services > Credentials > Create credentials > OAuth client ID**.
   - **Type:** **Web application**
   - **Authorized JavaScript origins:** your Netlify address
   - **Authorized redirect URIs:** the **Callback URL** shown in Supabase under **Authentication > Sign In / Providers > Google**. It looks like `https://abcdefgh.supabase.co/auth/v1/callback`.
   - Click **Create** and copy the **Client ID** and **Client secret**.
4. In Supabase, open **Authentication > Sign In / Providers > Google**, turn it on, paste the ID and secret, and click **Save**.
5. If the consent screen shows "Testing", click **Publish app**, or add each crew member's Google address as a test user.

## Part 4: Connect Netlify (about 5 minutes)

1. In Netlify, open your site, then **Site configuration > Environment variables > Add a variable**, and add all three:

   | Key | Value | Notes |
   |---|---|---|
   | `SUPABASE_URL` | the Project URL | |
   | `SUPABASE_ANON_KEY` | the publishable / anon key | public, goes in the page |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret / service_role key | tick **Contains secret values**; under **Scopes**, choose **Functions** only |

2. Open **Deploys > Trigger deploy > Deploy site**. When it finishes:
   - The deploy log should include `cloud on (https://abcdefgh.supabase.co)`.
   - The **Functions** tab should list `invite`.
3. Open the site. You should see the **Sign in** screen.

## Part 5: Your first sign-in and inviting the crew

1. On the sign-in screen, choose **First time? Set up your account**. Enter **dane@vektorprojects.com**, choose a password, then click the confirmation link that arrives from datum@vektorprojects.com. Or use **Continue with Google**.
2. Sign in. Click the **person icon** (top right), then **Team**.
3. Enter a crew member's email, choose **Viewer** or **Editor**, and click **Invite**. The app should say **Invite email sent**.
4. They click **Accept the invite** in the email, choose a password, and they're in. The Team screen moves them from **Invited, not signed in yet** to **People**.
5. From Team you can also:
   - **Resend email** if they lost it.
   - Change anyone's **role**.
   - **Remove access** or **Restore** it.
   - **Cancel** an invite they haven't used.

**If emails don't arrive:**
- Ask them to check their spam folder.
- In Supabase, check **Authentication > Emails > SMTP Settings**, then look at **Logs > Auth** for the error.
- **Email invite** on the Team screen still opens your own mail app with the sign-up steps written out, as a backup.

## Day to day

- **Editors:** import a CSV, then **Save to cloud...** in the side panel. From then on, changes save automatically; the top bar shows **Saved**, **Saving...** or **Offline - will sync**. To share, go to **person icon > Share**.
- **Viewers:** they sign in and see **Shared with me**. Projects open view only, and pick up the owner's latest version whenever the app is opened.
- **Offline:** once signed in, the app and the last opened project keep working without signal. An editor's changes upload when the connection returns.
- **Shared devices:** when a different person signs in on the same device, the screen is cleared for them.
- **Forgot password:** use the link on the sign-in screen. The reset email comes from datum@vektorprojects.com.
- **Free plan:** Supabase may pause a free project after about a week unused. Click **Restore** in the Supabase dashboard if the app can't reach the cloud.
- **App password:** if you ever remove the Google app password, emails stop until you create a new one and paste it into Supabase's SMTP settings.

## If the admin changes

Run this in the Supabase SQL Editor with the new person's email. They must have been invited and have signed in once first.

```sql
update public.profiles set role = 'admin' where email = 'new.admin@example.com';
```

## For developers

- **Local build:** put the URL and publishable key in `datum.config.json` (copy `datum.config.example.json`) and run `npm run build`. The file is git-ignored. Without them the app builds with no sign-in screen, which is handy for local work.
- **Invite function:** `netlify/functions/invite.mjs` checks the caller is an admin, saves the invite, then calls Supabase's admin invite API. Unit tests: `node tests/invite-fn.test.mjs`.
- **Access rules:** `supabase/test/rls_test.sql` checks them on plain Postgres. Run `supabase/test/auth_stub.sql`, then `supabase/schema.sql`, then the test, against an empty database.
- **App screens:** `tests/cloud.test.mjs` drives the sign-in wall, invites (by email and manual), the first-time password step, roles, projects and sharing against a stand-in Supabase client (`tests/mock-supabase.js`).
