import { listMedicationsWithRoutes } from "../../../lib/airtable";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await listMedicationsWithRoutes();
    return Response.json(data, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
