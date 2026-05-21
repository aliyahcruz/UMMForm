import { updateRecord, normalizeFields } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();

    if (process.env.EDIT_KEY && body.editKey !== process.env.EDIT_KEY) {
      return Response.json({ error: "Invalid edit key." }, { status: 401 });
    }

    const fields = normalizeFields(body.fields || {});
    const record = await updateRecord(params.id, fields);
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
