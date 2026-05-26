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


## Corrected Home Infusion display v4.7

This version enforces:

- `All locations` selected: table shows `Location | Route | Status`; no Home Infusion Details block.
- `Home Infusion` selected: table shows only `Route | Status`, then the Home Infusion Details box underneath.
- The Home Infusion Details box only shows:
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


## Final Home Infusion display v4.8

This version explicitly implements:

- All locations selected:
  - Shows `Location | Route | Status`.
  - Home Infusion appears only as a normal location row.
  - No Home Infusion Details box appears.

- Home Infusion selected:
  - Shows only `Route | Status`.
  - Hides the Location column.
  - Shows Home Infusion Details underneath the Route/Status row.

Home Infusion Details only pulls:
Therapeutic Class, MOA, Indication(s), Frequency, Dosing, Infusion TIme, Pre-Medications, REMs Program, HZD Status, Pharmacy Considerations, Preparation, Peds Renal Liver Considerations, Pretreatment, Ongoing Treatment, 1st Lifetime Dose, Nursing Considerations.

Footer marker:
Final HI display v4.8


## Home Infusion details below route table v4.9

This version changes Home Infusion display exactly as requested:

- If no specific location is selected / All locations:
  - Home Infusion details from `UMM Formulary` do NOT display.
  - Home Infusion only appears as a normal row in `Location | Route | Status`.

- If `Home Infusion` is selected:
  - The route table shows `Route | Status`.
  - The Home Infusion Details block appears UNDER the Route/Status table.
  - The details block pulls only:
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

Footer marker:
HI details below table v4.9


## Removed synthetic Home Infusion row v5.0

When `Home Infusion` is selected as the location:

- The top `Route | Status` table no longer shows the synthetic `Home Infusion | Status not listed` row from the `UMM Formulary` table.
- The actual route/status rows from the regular `Routes` table still display.
- The `UMM Formulary` data still appears underneath in the `Home Infusion Details` box.

Footer marker:

```text
Removed HI status row v5.0
```


## Home Infusion v5.1

This version changes Home Infusion rows to be detail-only:

- Synthetic rows from `UMM Formulary` are hidden from the top route/status table in **all** location modes.
- When `All locations` is selected, Home Infusion detail rows do not appear.
- When `Home Infusion` is selected:
  - no `Home Infusion / Status not listed` row appears
  - actual route/status rows from the regular `Routes` table can still appear
  - `UMM Formulary` fields appear only in the Home Infusion Details box
- The Home Infusion Details box now has a vertical scrollbar so all rows can be viewed.

Footer marker:

```text
Detail-only HI rows v5.1
```


## Strict Home Infusion display v5.2

This version enforces:

- Synthetic `UMM Formulary` rows are never shown in the top Route/Status table.
- When `Home Infusion` is selected:
  - no `Home Infusion / Status not listed` banner appears
  - if there are no real Routes-table rows, the top Route/Status table disappears
  - the Home Infusion Details box still appears from the `UMM Formulary` table
- The Home Infusion Details area has a scroll bar so all fields can be viewed.

Footer marker:

```text
Strict HI details v5.2
```


## Scroll fix v5.3

This version forces the Home Infusion Details table to use a visible vertical scrollbar.

The scrollable area is set to:

```text
height: 520px
overflow-y: scroll
```

This should allow all Home Infusion detail fields after Dosing to be viewed.

Footer marker:

```text
Scroll fix v5.3
```


## All Home Infusion fields v5.4

This version fixes missing Home Infusion detail rows.

Instead of requiring exact Airtable field-name matches, it now:

- displays the requested Home Infusion fields in order
- supports common naming variations, including `Infusion Time` and `Infusion TIme`
- includes any additional non-hidden `UMM Formulary` columns underneath
- uses a larger scrollable details area so all rows can be viewed

Footer marker:

```text
All HI fields v5.4
```


## Selected Home Infusion columns v5.5

This version limits the Home Infusion Details box to only these columns, in this order:

- Therapeutic Class
- MOA
- Indication(s)
- Frequency
- Dosing
- Infusion Time
- Pre-medications
- REMs Program
- HZD Status
- Pharmacy Considerations
- Preparation
- Peds, Renal, Liver, etc Considerations
- Pretreatment Screening Requirements
- Ongoing Treatment Parameters
- 1st Lifetime Dose in HOPD
- Nursing Considerations

No extra `UMM Formulary` columns are displayed.

Footer marker:

```text
Selected HI columns v5.5
```


## Force all selected Home Infusion rows v5.6

This version forces every requested Home Infusion Details row to display, even if the Airtable value is blank or the Airtable field name has a minor spelling/capitalization variation.

Rows now always include:

- Therapeutic Class
- MOA
- Indication(s)
- Frequency
- Dosing
- Infusion Time
- Pre-medications
- REMs Program
- HZD Status
- Pharmacy Considerations
- Preparation
- Peds, Renal, Liver, etc Considerations
- Pretreatment Screening Requirements
- Ongoing Treatment Parameters
- 1st Lifetime Dose in HOPD
- Nursing Considerations

Blank values display as `—`.

Footer marker:

```text
Force all selected HI rows v5.6
```


## Clean Airtable IDs v5.7

This version hides raw Airtable linked-record IDs such as:

```text
recvGiWNBvS286kRS
recXXXXXXXXXXXXXX
```

If a Home Infusion field only contains a linked-record ID or empty value, the UI now displays a blank/dash instead of the Airtable record identifier.

Footer marker:

```text
Clean Airtable IDs v5.7
```


## Admin search/edit workflow v5.8

The admin page no longer opens with the edit-medication table.

New admin workflow:

1. Go to `/admin`.
2. Search for a medication.
3. Click `Edit Medication`.
4. Edit fields from:
   - `Medications`
   - related `Routes`
   - related `UMM Formulary`
5. Save changes.

Footer marker:

```text
Admin search-edit v5.8
```


## Admin UMM Formulary edit v5.9

Fixes UMM Formulary edit visibility.

Changes:

- Related UMM Formulary records now match by linked Airtable `Medication` field, Medication ID, Generic Name, and Brand Name.
- Admin page now includes a direct `Edit UMM Formulary records directly` search section.
- If a UMM Formulary row is not linked to a medication, it can still be found and edited from the direct UMM search section.

Footer marker:

```text
Admin UMM edit v5.9
```


## Pending changes and version history v6.0

This version adds:

- blank UMM Formulary columns still show as editable fields in admin
- hidden front-end UMM Formulary columns remain visible in admin
- admins can `Save to Airtable`
- admins can `Pend change for front end`
- pending changes overlay on the public front end without updating the original Airtable row
- version history is available in each admin record editor

### Add these Airtable tables

Create a table named:

```text
Pending Changes
```

Recommended fields:

- Table Name
- Record ID
- Medication ID
- Generic Name
- Brand Name
- Change Status
- Fields JSON
- Change Note

Create a table named:

```text
Version History
```

Recommended fields:

- Table Name
- Record ID
- Medication ID
- Generic Name
- Brand Name
- Action
- Fields JSON
- Change Note

### Add these Vercel variables

```text
AIRTABLE_PENDING_CHANGES_TABLE=Pending Changes
AIRTABLE_VERSION_HISTORY_TABLE=Version History
```

Footer marker:

```text
Pending history admin v6.0
```


## Pending admin-only v6.1

Clarifications implemented:

- Blank fields from all Airtable tables now appear in admin edit forms through preferred field lists:
  - Medications
  - Routes
  - UMM Formulary
- Hidden front-end UMM Formulary columns remain visible/editable in admin.
- Pending changes are admin-only.
- Pending changes do **not** overlay or appear on the public front end.
- Public front end updates only after `Save to Airtable` is selected.
- Pending changes remain stored in the `Pending Changes` Airtable table for review.
- Version history remains available.

Footer marker:

```text
Pending admin-only v6.1
```


## Restore Home Infusion Details v6.2

This version keeps v6.1 admin-only pending changes, but restores the public front-end Home Infusion Details table.

Behavior:
- Pending changes do not display on the public front end.
- Home Infusion Details from the actual `UMM Formulary` table display when `Home Infusion` is selected.
- The synthetic `Home Infusion / Status not listed` row remains hidden.
- The details table is scrollable.
- All selected Home Infusion detail rows display, with blank values shown as `—`.

Footer marker:

```text
Restore HI details v6.2
```


## Admin UMM-only edit cleanup v6.3

This version keeps the v6.2 public Home Infusion Details behavior and changes admin editing:

- The Routes table editor now shows only real `Routes` Airtable rows.
- The synthetic/non-route Home Infusion rows are removed from the Routes edit section.
- Home Infusion-specific edits are handled only in the `UMM Formulary table` section.

Footer marker:

```text
Admin UMM-only v6.3
```


## Admin submitted-by v6.4

Adds an `Admin name` input on `/admin`.

Behavior:
- The entered name is stored as:
  - `Submitted By`
  - `Reviewed By`
- Applies to:
  - Pending Changes
  - Version History
- No authentication/login required.

Add these Airtable fields:

### Pending Changes
- Submitted By (single line text)
- Reviewed By (single line text)

### Version History
- Submitted By (single line text)
- Reviewed By (single line text)

Footer marker:

```text
Admin submitted-by v6.4
```


## Admin clean pending v6.5

Changes included:

- `Medication` is removed from editable fields and is not sent to Airtable on save.
- `Medication ID`, `Generic Name`, and `Brand Name` are auto-populated from the selected medication when editing related `Routes` or `UMM Formulary` records if those fields are blank.
- `Admin name` is now required before saving or pending changes.
- Pending Changes records now include a human-readable `Change Summary`.

### Add this field to Pending Changes and Version History

| Field name | Type |
|---|---|
| Change Summary | Long text |

### Cleanest way to review proposed changes

Use the `Change Summary` field in the `Pending Changes` table. It shows proposed changes like:

```text
UMMS Formulary Status: "Non-formulary" → "Formulary"
Notes: "blank" → "Restricted to Home Infusion"
```

The `Fields JSON` field remains useful for technical backup, but `Change Summary` is the clean reviewer-facing field.

Footer marker:

```text
Admin clean pending v6.5
```
