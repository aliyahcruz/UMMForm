import { listUmmFormularyRecordsOnly } from "../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ records: await listUmmFormularyRecordsOnly() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
