
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID || "app0N8QuzDVd5jmfN";
const MED_TABLE = process.env.AIRTABLE_MEDICATIONS_TABLE || "Medications";
const ROUTE_TABLE = process.env.AIRTABLE_ROUTES_TABLE || "Routes";
const UMM_TABLE = process.env.AIRTABLE_UMM_FORMULARY_TABLE || "UMM Formulary";
const PENDING_CHANGES_TABLE = process.env.AIRTABLE_PENDING_CHANGES_TABLE || "Pending Changes";
const VERSION_HISTORY_TABLE = process.env.AIRTABLE_VERSION_HISTORY_TABLE || "Version History";

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

async function withTimeout(promise, ms, label) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function listTable(table, options = {}) {
  const records = [];
  let offset = "";
  let pageGuard = 0;
  const optional = Boolean(options.optional);
  const timeoutMs = options.timeoutMs || 12000;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);

    let data;
    let lastError;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        data = await withTimeout(
          airtableFetch(url(table, `?${params.toString()}`)),
          timeoutMs,
          `Airtable table ${table}`
        );
        break;
      } catch (error) {
        lastError = error;
        const message = String(error?.message || "");

        // Do not recursively restart the whole table load. It makes the site feel stuck.
        if (message.includes("LIST_RECORDS_ITERATOR_NOT_AVAILABLE")) {
          await sleep(400);
          continue;
        }

        if (optional) {
          console.warn(`Optional Airtable table skipped: ${table}`, error);
          return [];
        }

        throw error;
      }
    }

    if (!data) {
      if (optional) {
        console.warn(`Optional Airtable table skipped: ${table}`, lastError);
        return [];
      }
      throw lastError || new Error(`Airtable request failed: unable to list table ${table}`);
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
    listTable(UMM_TABLE, { optional: true, timeoutMs: 3500 })
  ]);

  const byRecordId = new Map();
  const byMedId = new Map();
  const byGenericBrand = new Map();
  const byGenericOnly = new Map();
  const locations = new Set();

  function comboKey(generic, brand) {
    return `${key(generic)}|||${key(brand)}`;
  }

  for (const med of medications) {
    const item = { ...med, routes: [] };
    const medId = med["Medication ID"];
    const generic = med["Generic Name"];
    const brand = med["Brand Name"];

    byRecordId.set(med.id, item);

    if (medId) byMedId.set(String(medId), med.id);

    if (generic && brand) {
      byGenericBrand.set(comboKey(generic, brand), med.id);
    }

    if (generic && !byGenericOnly.has(key(generic))) {
      byGenericOnly.set(key(generic), []);
    }

    if (generic) {
      byGenericOnly.get(key(generic)).push({ id: med.id, brand: key(brand) });
    }
  }

  function findMedicationForRoute(route) {
    const linkedId = firstLinkedId(route["Medication"]);
    if (linkedId && byRecordId.has(linkedId)) return linkedId;

    const medId = route["Medication ID"];
    if (medId && byMedId.has(String(medId))) return byMedId.get(String(medId));

    const generic = route["Generic Name"];
    const brand = route["Brand Name"];

    // Best non-linked match: exact Generic + Brand.
    if (generic && brand && byGenericBrand.has(comboKey(generic, brand))) {
      return byGenericBrand.get(comboKey(generic, brand));
    }

    // Fallback: exact Generic only, but only if that generic maps to one medication row.
    // This prevents all routes for one generic from being dumped under the wrong brand.
    if (generic && byGenericOnly.has(key(generic))) {
      const candidates = byGenericOnly.get(key(generic));
      if (candidates.length === 1) return candidates[0].id;
    }

    return "";
  }

  function attachRoute(route, forcedLocation = "", forcedSource = "Routes") {
    const medRecordId = findMedicationForRoute(route);
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
      brandName: route["Brand Name"] || "",
      source: forcedSource,
      details: forcedSource === "UMM Formulary" ? route : null
    });
  }

  for (const route of routes) {
    attachRoute(route);
  }

  // UMM Formulary rows are Home Infusion route/status rows.
  // They must link to an existing Medications row by linked Medication, Medication ID,
  // Generic + Brand, or unambiguous Generic-only match.
  for (const ummRow of ummRows) {
    attachRoute(
      {
        ...ummRow,
        Route: ummRow["Route"] || ummRow["Dosage Form"] || ummRow["Form"] || "Home Infusion",
        "UMMS Formulary Status": ummRow["UMMS Formulary Status"] || ummRow["Status"] || ummRow["Formulary Status"] || "",
        Notes: ummRow["Notes"] || ummRow["Restrictions"] || "",
        "Therapeutic Interchanges": ummRow["Therapeutic Interchanges"] || ummRow["Therapeutic Interchange"] || ""
      },
      "Home Infusion",
      "UMM Formulary"
    );
  }

  const records = Array.from(byRecordId.values())
    .map(record => ({
      ...record,
      routes: (record.routes || []).sort((a, b) => {
        const locationCompare = String(a.location || "").localeCompare(String(b.location || ""));
        if (locationCompare !== 0) return locationCompare;
        return String(a.route || "").localeCompare(String(b.route || ""));
      })
    }))
    .sort((a, b) => {
      const genericCompare = String(a["Generic Name"] || "").localeCompare(String(b["Generic Name"] || ""), undefined, { sensitivity: "base" });
      if (genericCompare !== 0) return genericCompare;
      return String(a["Brand Name"] || "").localeCompare(String(b["Brand Name"] || ""), undefined, { sensitivity: "base" });
    });

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
    listTable(UMM_TABLE, { optional: true, timeoutMs: 3500 })
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


export function normalizeDynamicFields(input) {
  const fields = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (key === "id") continue;

    if (Array.isArray(value)) {
      fields[key] = value
        .map(item => String(item || "").trim())
        .filter(Boolean);
      continue;
    }

    fields[key] = String(value ?? "").trim();
  }

  return fields;
}

export async function listUmmFormularyRecordsOnly() {
  return listTable(UMM_TABLE, { optional: true, timeoutMs: 6000 });
}

export async function updateUmmFormulary(id, fields) {
  return airtableFetch(url(UMM_TABLE, `/${id}`), {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}


export async function listPendingChangeRecordsOnly() {
  return listTable(PENDING_CHANGES_TABLE, { optional: true, timeoutMs: 6000 });
}

export async function listVersionHistoryRecordsOnly() {
  return listTable(VERSION_HISTORY_TABLE, { optional: true, timeoutMs: 6000 });
}

export async function createPendingChange(fields) {
  return airtableFetch(url(PENDING_CHANGES_TABLE), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export async function createVersionHistory(fields) {
  return airtableFetch(url(VERSION_HISTORY_TABLE), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export function safeParseJson(value, fallback = {}) {
  try {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

export function normalizePendingChangeFields(input) {
  const fields = {
    "Table Name": String(input["Table Name"] || input.tableName || "").trim(),
    "Record ID": String(input["Record ID"] || input.recordId || "").trim(),
    "Medication ID": String(input["Medication ID"] || input.medicationId || "").trim(),
    "Generic Name": String(input["Generic Name"] || input.genericName || "").trim(),
    "Brand Name": String(input["Brand Name"] || input.brandName || "").trim(),
    "Change Status": String(input["Change Status"] || input.status || "Pending").trim(),
    "Fields JSON": typeof input["Fields JSON"] === "string"
      ? input["Fields JSON"]
      : JSON.stringify(input.fields || input["Fields"] || {}),
    "Change Note": String(input["Change Note"] || input.note || "").trim()
  };

  Object.keys(fields).forEach(key => {
    if (fields[key] === "") delete fields[key];
  });

  return fields;
}

export function normalizeVersionHistoryFields(input) {
  const fields = {
    "Table Name": String(input["Table Name"] || input.tableName || "").trim(),
    "Record ID": String(input["Record ID"] || input.recordId || "").trim(),
    "Medication ID": String(input["Medication ID"] || input.medicationId || "").trim(),
    "Generic Name": String(input["Generic Name"] || input.genericName || "").trim(),
    "Brand Name": String(input["Brand Name"] || input.brandName || "").trim(),
    "Action": String(input["Action"] || input.action || "").trim(),
    "Fields JSON": typeof input["Fields JSON"] === "string"
      ? input["Fields JSON"]
      : JSON.stringify(input.fields || {}),
    "Change Note": String(input["Change Note"] || input.note || "").trim()
  };

  Object.keys(fields).forEach(key => {
    if (fields[key] === "") delete fields[key];
  });

  return fields;
}
