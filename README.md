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


## Verification marker

This version displays a small footer text:

```text
Home Infusion update v4.1
```

If you do not see that on the deployed website, Vercel is not deploying this package.

## Required Home Infusion variable

Add this Vercel environment variable:

```text
AIRTABLE_UMM_FORMULARY_TABLE=UMM Formulary
```


## Better Airtable error messages

This version improves Airtable error handling so the website displays the real Airtable error instead of:

```text
[object Object]
```

Common messages you may now see:
- `404 NOT_FOUND` = table name is wrong or token cannot access it
- `403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND` = token lacks access to the base/table
- `422 UNKNOWN_FIELD_NAME` = field name in code does not match Airtable


## Airtable pagination retry fix

This version retries Airtable list requests when Airtable returns:

```text
422 LIST_RECORDS_ITERATOR_NOT_AVAILABLE
```

The optional `UMM Formulary` table is also allowed to fail without taking down the primary `Medications` + `Routes` display.


## Faster loading update

This version improves load speed by:

- removing recursive Airtable pagination restarts
- retrying Airtable iterator errors only briefly
- treating `UMM Formulary` as optional and timing it out quickly
- caching `/api/records` for 5 minutes on Vercel
- removing `cache: "no-store"` from the public page fetch

After deploying, look for:

```text
Faster load v4.2
```

If you do not see that marker, Vercel is not serving this version.


## Refined search update

This version reduces unrelated results by:

- prioritizing exact Generic Name, Brand Name, and Medication ID matches
- prioritizing starts-with matches
- limiting fuzzy matching to Generic/Brand/Medication ID only
- lowering Fuse.js typo tolerance to `threshold: 0.22`
- only searching route/status text for queries of 3+ characters
- only searching Notes/Therapeutic Interchanges for queries of 5+ characters
- sorting results by match quality before displaying

Look for this footer marker after deployment:

```text
Refined search v4.3
```


## Brand-aware route grouping

This version prevents route/status rows from being grouped under the wrong brand.

Route rows now match Medications in this order:

1. linked `Medication` field
2. `Medication ID`
3. exact `Generic Name` + `Brand Name`
4. exact `Generic Name` only, but only when that generic has one medication record

If one generic has multiple brands, route rows should include either:
- linked `Medication`, or
- `Medication ID`, or
- both `Generic Name` and `Brand Name`

Look for this footer marker after deployment:

```text
Brand-aware routes v4.4
```


## Home Infusion details block

When the top-right location dropdown is set to:

```text
Home Infusion
```

rows from the `UMM Formulary` Airtable table display:

```text
Route | Status
```

Then underneath each Home Infusion row, the website displays all remaining columns from the `UMM Formulary` table in a details block.

The details block hides duplicate/key fields such as:

- Medication
- Medication ID
- Generic Name
- Brand Name
- Route
- Location
- Status/Formulary Status

Look for this footer marker after deployment:

```text
Home Infusion details v4.5
```


## Home Infusion specific-field update

When `All locations` is selected:
- Home Infusion rows appear only as normal `Location | Route | Status` rows.
- The Home Infusion Details box is not displayed.

When `Home Infusion` is selected:
- The display shows `Route | Status`.
- Under that row, the Home Infusion Details box appears.
- The details box only pulls these fields from `UMM Formulary`:
  - Therapeutic Class
  - MOA
  - Indication(s)
  - Frequency
  - Dosing
  - Infusion TIme
  - Pre-Medications
  - REMs Program
  - HZD Status
  - Pharmacy Considerations
  - Preparation
  - Peds Renal Liver Considerations
  - Pretreatment
  - Ongoing Treatment
  - 1st Lifetime Dose
  - Nursing Considerations

Look for this footer marker after deployment:

```text
Specific fields v4.6
```
