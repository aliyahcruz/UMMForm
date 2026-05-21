# UMMS Formulary Search — Relational Airtable Version

This project is for the split Airtable structure:

- `Medications`
- `Routes`

Public page:
- `/`

Admin page:
- `/admin`

## Airtable fields

Medications table:
- `Medication ID`
- `Generic Name`
- `Brand Name`
- `Notes`
- `Therapeutic Interchanges`

Routes table:
- `Medication` linked record to Medications, recommended
- `Medication ID`, fallback
- `Generic Name`, fallback
- `Route`
- `UMMS Formulary Status`
- `Notes`
- `Therapeutic Interchanges`

## Vercel environment variables

Add each separately:

- `AIRTABLE_TOKEN` = new Airtable token
- `AIRTABLE_BASE_ID` = `app0N8QuzDVd5jmfN`
- `AIRTABLE_MEDICATIONS_TABLE` = `Medications`
- `AIRTABLE_ROUTES_TABLE` = `Routes`
- `EDIT_KEY` = optional admin edit password

Token scopes:
- `data.records:read`
- `data.records:write`

## Upload instructions

1. Download and unzip this project.
2. Open your GitHub repository.
3. Replace the old project files with the contents of this folder.
4. Your GitHub root should show `app/`, `lib/`, `package.json`, `next.config.js`, and `vercel.json`.
5. Commit the changes.
6. Vercel will automatically redeploy.
7. If it does not, use Vercel → Deployments → Redeploy.
