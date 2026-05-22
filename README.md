# UMMS Formulary Search — Location Filter Version

This version supports location-specific formulary status.

## Airtable structure

### Medications table

Recommended fields:

- `Medication ID`
- `Generic Name`
- `Brand Name`
- `Notes`
- `Therapeutic Interchanges`

### Routes table

Recommended fields:

- `Medication` — linked record to Medications
- `Medication ID` — fallback/helper
- `Generic Name` — fallback/helper
- `Route`
- `Location`
- `UMMS Formulary Status`
- `Notes`
- `Therapeutic Interchanges`

The website uses `Location` to create the public location dropdown.

## Pages

- `/` public search page
- `/admin` admin add/edit page

## Vercel environment variables

Add each separately:

- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID` = `app0N8QuzDVd5jmfN`
- `AIRTABLE_MEDICATIONS_TABLE` = `Medications`
- `AIRTABLE_ROUTES_TABLE` = `Routes`
- `EDIT_KEY` = optional

The Airtable token needs:

- `data.records:read`
- `data.records:write`

The token must have access to the Medkeeper base.

## Upload instructions

1. Download this ZIP.
2. Unzip it.
3. In GitHub, replace the old project files with the contents of this folder.
4. The GitHub repo root should contain:
   - `app/`
   - `lib/`
   - `package.json`
   - `next.config.js`
   - `vercel.json`
5. Commit the changes.
6. Vercel should redeploy automatically.
7. If needed, redeploy manually from Vercel Deployments.

## What changed

- Public page has a Location dropdown.
- Search results only show route/status rows for the selected location.
- All Locations remains available.
- Admin route editor now includes a Location field.


## DailyMed automatic label links

This version adds a server-side `/api/dailymed` route.

On the public search page, each medication result attempts to find the best automatic DailyMed match using the medication's `Generic Name`.

The displayed link is:

- `View DailyMed Label`

Because DailyMed may contain multiple labels for the same drug, the link is marked as an automatic match.

## Location selector placement

The Location dropdown is now fixed in the top-right corner of the public search page.

On mobile, it moves below the search area for usability.


## Email OTP lock

This version adds Supabase Auth email OTP protection.

Users must sign in with an email ending in:

```text
@umm.edu
```

Protected routes include:

- `/`
- `/admin`
- `/api/records`
- `/api/dailymed`
- `/api/admin/*`

Public routes include:

- `/login`
- `/auth/callback`

## Additional Vercel environment variables

Add these in Vercel:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `ALLOWED_EMAIL_DOMAIN` | `umm.edu` |

Keep the existing Airtable variables too.

## Supabase setup

1. Create a Supabase project.
2. Go to Authentication → Providers → Email.
3. Enable Email provider.
4. Enable OTP / magic link email login.
5. Add your Vercel URL to Authentication → URL Configuration:
   - Site URL: your production Vercel URL
   - Redirect URL: `https://your-domain.com/auth/callback`
6. Copy Project URL and anon key into Vercel environment variables.
7. Redeploy in Vercel.

Note: The login page blocks non-`@umm.edu` emails, and middleware also blocks authenticated users whose email is not in that domain.


## Search result display update

Medication route rows now display as:

```text
Location | Route | Status
```

The result section header was updated to:

```text
Location / Route / Status
```
