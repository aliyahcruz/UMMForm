
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID || "app0N8QuzDVd5jmfN";
const MED_TABLE = process.env.AIRTABLE_MEDICATIONS_TABLE || "Medications";
const ROUTE_TABLE = process.env.AIRTABLE_ROUTES_TABLE || "Routes";
const UMM_TABLE = process.env.AIRTABLE_UMM_FORMULARY_TABLE || "UMM Formulary";

function url(table, path = "") {
  return `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${path}`;
}

async function airtableFetch(requestUrl, options = {}) {
  if (!AIRTABLE_TOKEN) throw new Error("AIRTABLE_TOKEN is not configured.");

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

  if (!response.ok) {
    const airtableError = payload?.error;
    const message =
      airtableError?.message ||
      airtableError?.type ||
      (typeof airtableError === "string" ? airtableError : "") ||
      JSON.stringify(payload) ||
      response.statusText;

    throw new Error(`Airtable request failed: ${response.status} ${message}`);
  }

  return payload;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function listTable(table) {
  const records = [];
  let offset = "";
  let pageGuard = 0;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);

    let data;
    let attempts = 0;

    while (attempts < 3) {
      try {
        data = await airtableFetch(url(table, `?${params.toString()}`));
        break;
      } catch (error) {
        const message = String(error?.message || "");

        // Airtable can occasionally invalidate a pagination iterator.
        // Restarting the full table read is safer than surfacing a broken offset error.
        if (message.includes("LIST_RECORDS_ITERATOR_NOT_AVAILABLE")) {
          if (offset) {
            return listTable(table);
          }
          await sleep(500 * (attempts + 1));
          attempts += 1;
          continue;
        }

        throw error;
      }
    }

    if (!data) {
      throw new Error(`Airtable request failed: unable to list table ${table}`);
    }

    records.push(...(data.records || []));
    offset = data.offset || "";

    pageGuard += 1;
    if (pageGuard > 500) {
      throw new Error(`Airtable request failed: pagination limit exceeded for ${table}`);
    }
  } while (offset);

  return records.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

function firstLinkedId(value) {
  return Array.isArray(value) ? (value[0] || "") : "";
}

function key(value) {
  return String(value || "").trim().toLowerCase();
}

function getLocation(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "").trim();
}

export async function listMedicationsWithRoutes() {
  const [medications, routes, ummRows] = await Promise.all([
    listTable(MED_TABLE),
    listTable(ROUTE_TABLE),
    listTable(UMM_TABLE).catch(() => [])
  ]);

  const byRecordId = new Map();
  const byMedId = new Map();
  const byName = new Map();
  const locations = new Set();

  for (const med of medications) {
    const item = { ...med, routes: [] };
    byRecordId.set(med.id, item);

    if (med["Medication ID"]) byMedId.set(String(med["Medication ID"]), med.id);
    if (med["Generic Name"]) byName.set(key(med["Generic Name"]), med.id);
  }

  function attachRoute(route, forcedLocation = "", forcedSource = "Routes") {
    let medRecordId = firstLinkedId(route["Medication"]);

    if (!medRecordId && route["Medication ID"]) {
      medRecordId = byMedId.get(String(route["Medication ID"])) || "";
    }

    if (!medRecordId && route["Generic Name"]) {
      medRecordId = byName.get(key(route["Generic Name"])) || "";
    }

    const med = byRecordId.get(medRecordId);
    if (!med) return;

    const location = forcedLocation || getLocation(route["Location"] || route["Site"] || route["Hospital"]);
    if (location) locations.add(location);

    med.routes.push({
      id: route.id,
      route: route["Route"] || route["Dosage Form"] || route["Form"] || "",
      location,
      status: route["UMMS Formulary Status"] || route["Status"] || route["Formulary Status"] || "",
      notes: route["Notes"] || route["Restrictions"] || "",
      therapeuticInterchanges: route["Therapeutic Interchanges"] || route["Therapeutic Interchange"] || "",
      source: forcedSource || (forcedLocation ? "UMM Formulary" : "Routes")
    });
  }

  for (const route of routes) {
    attachRoute(route);
  }

  // Records from the separate UMM Formulary table are treated as Home Infusion route/status rows.
  // IMPORTANT: The Medications table remains the primary medication source.
  // UMM Formulary rows only display if they can be matched back to an existing Medications record.
  for (const ummRow of ummRows) {
    attachRoute(
      {
        ...ummRow,
        Route: ummRow["Route"] || ummRow["Dosage Form"] || ummRow["Form"] || "Home Infusion",
        "UMMS Formulary Status": ummRow["UMMS Formulary Status"] || ummRow["Status"] || ummRow["Formulary Status"] || "",
        Notes: ummRow["Notes"] || ummRow["Restrictions"] || "",
        "Therapeutic Interchanges": ummRow["Therapeutic Interchanges"] || ummRow["Therapeutic Interchange"] || ""
      },
      "Home Infusion"
    );
  }

  const records = Array.from(byRecordId.values()).sort((a, b) =>
    String(a["Generic Name"] || "").localeCompare(String(b["Generic Name"] || ""), undefined, { sensitivity: "base" })
  );

  return {
    records,
    locations: Array.from(locations).sort((a, b) => a.localeCompare(b))
  };
}

export async function listMedicationRecordsOnly() {
  return listTable(MED_TABLE);
}

export async function listRouteRecordsOnly() {
  const [routes, ummRows] = await Promise.all([
    listTable(ROUTE_TABLE),
    listTable(UMM_TABLE).catch(() => [])
  ]);

  return [
    ...routes,
    ...ummRows.map(row => ({ ...row, Location: row["Location"] || "Home Infusion", Source: "UMM Formulary" }))
  ];
}

export function normalizeMedicationFields(input) {
  const allowed = [
    "Medication ID",
    "Generic Name",
    "Brand Name",
    "Notes",
    "Therapeutic Interchanges"
  ];

  const fields = {};
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      fields[field] = String(input[field] ?? "").trim();
    }
  }
  return fields;
}

export function normalizeRouteFields(input) {
  const fields = {};

  if (Object.prototype.hasOwnProperty.call(input, "Medication") && input["Medication"]) {
    fields["Medication"] = Array.isArray(input["Medication"])
      ? input["Medication"]
      : [String(input["Medication"])];
  }

  const allowed = [
    "Medication ID",
    "Generic Name",
    "Route",
    "Location",
    "UMMS Formulary Status",
    "Notes",
    "Therapeutic Interchanges"
  ];

  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      fields[field] = String(input[field] ?? "").trim();
    }
  }

  return fields;
}

export async function createMedication(fields) {
  return airtableFetch(url(MED_TABLE), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export async function updateMedication(id, fields) {
  return airtableFetch(url(MED_TABLE, `/${id}`), {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}

export async function createRoute(fields) {
  return airtableFetch(url(ROUTE_TABLE), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export async function updateRoute(id, fields) {
  return airtableFetch(url(ROUTE_TABLE, `/${id}`), {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}
