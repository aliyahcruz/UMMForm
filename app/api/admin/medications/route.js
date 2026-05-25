import { createMedication, listMedicationRecordsOnly, normalizeMedicationFields } from "../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ records: await listMedicationRecordsOnly() });
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

    const fields = normalizeMedicationFields(body.fields || {});
    if (!fields["Generic Name"]) {
      return Response.json({ error: "Generic Name is required." }, { status: 400 });
    }

    return Response.json({ record: await createMedication(fields) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
