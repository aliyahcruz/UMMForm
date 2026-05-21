# Formulary Airtable Search

Dynamic public website backed by Airtable.

## Features

- Public access
- Airtable base: `app0N8QuzDVd5jmfN`
- Table: `Formulary`
- Typo-tolerant search using Fuse.js
- Suggestions after 3 characters
- Users can add and update medications
- Airtable token stays server-side only

## Important security note

The previously shared Airtable token should be revoked and replaced. Do not commit `.env` or `.env.local`.

## Required Airtable token scopes

For search + user updates:

- `data.records:read`
- `data.records:write`

Restrict the token to base:

- `app0N8QuzDVd5jmfN`

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment variables

```bash
AIRTABLE_TOKEN=your_new_airtable_token
AIRTABLE_BASE_ID=app0N8QuzDVd5jmfN
AIRTABLE_TABLE_NAME=Formulary
EDIT_KEY=
```

`EDIT_KEY` is optional. If set, users must enter that key to save updates. If blank, the update form is public.

## Deploy on Vercel

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add environment variables in Vercel Project Settings.
4. Deploy.

## Airtable columns expected

- Generic Name
- Brand Name
- Route
- UMMS Formulary Status
- Notes
- Therapeutic Interchanges
