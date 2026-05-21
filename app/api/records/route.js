import { listMedicationsWithRoutes } from "../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await listMedicationsWithRoutes();
    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
