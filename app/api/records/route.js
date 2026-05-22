import { listMedicationsWithRoutes } from "../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listMedicationsWithRoutes();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
