import { createVersionHistory, listVersionHistoryRecordsOnly, normalizeVersionHistoryFields } from "../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ records: await listVersionHistoryRecordsOnly() });
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

    return Response.json({
      record: await createVersionHistory(normalizeVersionHistoryFields(body))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
