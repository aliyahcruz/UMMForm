const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "app0N8QuzDVd5jmfN";
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "Formulary";

if (!AIRTABLE_TOKEN) {
  console.warn("AIRTABLE_TOKEN is not configured. API routes will fail until it is set.");
}

function tableUrl(path = "") {
  const encodedTable = encodeURIComponent(AIRTABLE_TABLE_NAME);
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTable}${path}`;
}

async function airtableFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText;
    throw new Error(`Airtable request failed: ${message}`);
  }

  return payload;
}

export async function listAllRecords() {
  const all = [];
  let offset = "";

  do {
    const params = new URLSearchParams({
      pageSize: "100"
    });

    if (offset) params.set("offset", offset);

    const data = await airtableFetch(tableUrl(`?${params.toString()}`));
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return all.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

export async function updateRecord(recordId, fields) {
  return airtableFetch(tableUrl(`/${recordId}`), {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}

export async function createRecord(fields) {
  return airtableFetch(tableUrl(), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export function normalizeFields(input) {
  const allowed = [
    "Generic Name",
    "Brand Name",
    "Route",
    "UMMS Formulary Status",
    "Notes",
    "Therapeutic Interchanges"
  ];

  const fields = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      fields[key] = String(input[key] ?? "").trim();
    }
  }
  return fields;
}
