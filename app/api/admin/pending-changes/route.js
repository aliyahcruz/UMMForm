import { createPendingChange, createVersionHistory, listPendingChangeRecordsOnly, normalizePendingChangeFields, normalizeVersionHistoryFields } from "../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ records: await listPendingChangeRecordsOnly() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (process.env.EDIT_KEY && body.editKey !== process.env.EDIT_KEY) {
      return Response.json({ error: "Invalid edit key." }, { status: 401 });
    }

    const fields = normalizePendingChangeFields(body);
    const record = await createPendingChange(fields);

    await createVersionHistory(normalizeVersionHistoryFields({
      ...body,
      action: "Pending Change Created",
      fields: body.fields || {}
    })).catch(() => null);

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
