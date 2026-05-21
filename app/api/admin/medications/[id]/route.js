import { normalizeMedicationFields, updateMedication } from "../../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    if (process.env.EDIT_KEY && body.editKey !== process.env.EDIT_KEY) {
      return Response.json({ error: "Invalid edit key." }, { status: 401 });
    }
    return Response.json({ record: await updateMedication(params.id, normalizeMedicationFields(body.fields || {})) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
