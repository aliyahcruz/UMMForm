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
