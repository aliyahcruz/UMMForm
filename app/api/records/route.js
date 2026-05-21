import { listAllRecords, createRecord, normalizeFields } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await listAllRecords();
    return Response.json({ records });
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

    const fields = normalizeFields(body.fields || {});
    if (!fields["Generic Name"]) {
      return Response.json({ error: "Generic Name is required." }, { status: 400 });
    }

    const record = await createRecord(fields);
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
