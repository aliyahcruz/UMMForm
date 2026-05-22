# UMMS Formulary Search — Public No-Login Version

This version has **no Microsoft login**, **no OTP**, and **no sign-in requirement**.

## Pages

- `/` = public formulary search
- `/admin` = admin add/edit page

## Features

- Airtable-backed dynamic formulary search
- Medications + Routes relational table structure
- Location dropdown
- DailyMed automatic label links
- Admin add/edit page
- Optional `EDIT_KEY` for protecting save actions on `/admin`

## Required Vercel environment variables

Add these in Vercel:

| Key | Value |
|---|---|
| `AIRTABLE_TOKEN` | Your Airtable token |
| `AIRTABLE_BASE_ID` | `app0N8QuzDVd5jmfN` |
| `AIRTABLE_MEDICATIONS_TABLE` | `Medications` |
| `AIRTABLE_ROUTES_TABLE` | `Routes` |
| `EDIT_KEY` | Optional password for saving admin changes |

You no longer need these variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ALLOWED_EMAIL_DOMAIN`

## Upload instructions

1. Download and unzip this project.
2. Replace the files in your GitHub repository with the contents of this folder.
3. Make sure the repo root contains:
   - `app/`
   - `lib/`
   - `package.json`
   - `next.config.js`
   - `vercel.json`
4. Commit the changes.
5. Vercel should redeploy automatically.

## Security note

Because there is no login, anyone with the URL can view the formulary.

If `EDIT_KEY` is blank, anyone who visits `/admin` can save changes. Set `EDIT_KEY` in Vercel to require a password before admin saves are accepted.


## Home Infusion / UMM Formulary table

This version also reads a separate Airtable table:

```text
UMM Formulary
```

Add this Vercel environment variable:

```text
AIRTABLE_UMM_FORMULARY_TABLE=UMM Formulary
```

Rows from `UMM Formulary` are treated as `Home Infusion` formulary records.

Matching to the main `Medications` table is attempted using, in order:

1. linked `Medication` field
2. `Medication ID`
3. exact `Generic Name`

When the top-right location dropdown is set to `Home Infusion`, the app will show matching information from the `UMM Formulary` table.

When a specific location is selected, the result table hides the Location column and displays only:

```text
Route | Status
```


## Clarification: Medications remains primary

This version still uses the `Medications` table as the primary medication source.

The `UMM Formulary` table is only used to add Home Infusion route/status information to matching medication records. A row from `UMM Formulary` must match an existing `Medications` record by linked `Medication`, `Medication ID`, or exact `Generic Name`.

## Location display rule

- If `All locations` is selected: results show `Location | Route | Status`.
- If a specific location is selected, including `Home Infusion`: results show only `Route | Status`.
