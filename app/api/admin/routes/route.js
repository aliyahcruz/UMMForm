import { createRoute, listRouteRecordsOnly, normalizeRouteFields } from "../../../../lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ records: await listRouteRecordsOnly() });
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

    return Response.json({ record: await createRoute(normalizeRouteFields(body.fields || {})) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
