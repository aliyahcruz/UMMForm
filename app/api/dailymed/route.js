export const dynamic = "force-dynamic";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLabel(label, drugName) {
  const q = normalize(drugName);
  const title = normalize(label.title || "");
  const name = normalize(label.name || "");
  const combined = `${title} ${name}`;

  let score = 0;

  if (title === q || name === q) score += 100;
  if (title.startsWith(q) || name.startsWith(q)) score += 60;
  if (combined.includes(q)) score += 40;

  if (!combined.includes("animal")) score += 5;
  if (!combined.includes("veterinary")) score += 5;

  return score;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const drug = searchParams.get("drug");

    if (!drug || drug.trim().length < 2) {
      return Response.json({ error: "Drug name is required." }, { status: 400 });
    }

    const apiUrl = new URL("https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json");
    apiUrl.searchParams.set("drug_name", drug.trim());
    apiUrl.searchParams.set("pagesize", "25");

    const response = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) {
      return Response.json({ error: "DailyMed lookup failed." }, { status: response.status });
    }

    const data = await response.json();
    const labels = data?.data || [];

    if (!labels.length) {
      return Response.json({ match: null });
    }

    const best = labels
      .map(label => ({ ...label, score: scoreLabel(label, drug) }))
      .sort((a, b) => b.score - a.score)[0];

    const setid = best.setid || best.set_id || best.SETID;

    if (!setid) {
      return Response.json({ match: null });
    }

    return Response.json({
      match: {
        setid,
        title: best.title || best.name || drug,
        url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setid)}`,
        confidence: best.score >= 40 ? "best automatic match" : "possible match"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
