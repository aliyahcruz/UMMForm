import { listMedicationsWithRoutes } from "../../../lib/airtable";

export const revalidate = 60;


export async function GET() {
  try {
    const data = await listMedicationsWithRoutes();
    return Response.json(data, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
