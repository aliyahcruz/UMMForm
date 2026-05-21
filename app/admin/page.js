"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";

const FIELDS = [
  "Generic Name",
  "Brand Name",
  "Route",
  "UMMS Formulary Status",
  "Notes",
  "Therapeutic Interchanges"
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(field => [field, ""]));

function clean(value) {
  return String(value || "");
}

export default function AdminPage() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editKey, setEditKey] = useState("");
  const [status, setStatus] = useState("Loading Airtable records...");
  const [saving, setSaving] = useState(false);

  async function loadRecords() {
    setStatus("Loading Airtable records...");
    const response = await fetch("/api/records", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error || "Unable to load records.");
      return;
    }

    setRecords(data.records || []);
    setStatus(`${(data.records || []).length.toLocaleString()} records loaded.`);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const fuse = useMemo(() => new Fuse(records, {
    keys: [
      { name: "Generic Name", weight: 0.45 },
      { name: "Brand Name", weight: 0.35 },
      { name: "Route", weight: 0.07 },
      { name: "UMMS Formulary Status", weight: 0.05 },
      { name: "Notes", weight: 0.04 },
      { name: "Therapeutic Interchanges", weight: 0.04 }
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [records]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return records.slice(0, 25);
    return fuse.search(q).slice(0, 25).map(result => result.item);
  }, [fuse, query, records]);

  function startEdit(record) {
    setSelectedRecord(record);
    setForm(Object.fromEntries(FIELDS.map(field => [field, clean(record[field])])));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function startCreate() {
    setSelectedRecord(null);
    setForm(EMPTY_FORM);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function saveMedication(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("Saving...");

    const isUpdate = Boolean(selectedRecord?.id);
    const url = isUpdate ? `/api/records/${selectedRecord.id}` : "/api/records";
    const method = isUpdate ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: form, editKey })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(data.error || "Save failed.");
      return;
    }

    setStatus(isUpdate ? "Medication updated." : "Medication created.");
    await loadRecords();
  }

  return (
    <main>
      <section className="home adminHome">
        <p className="adminNav"><Link href="/">← Back to public search</Link></p>
        <h1>Formulary Admin</h1>
        <p className="subtitle">Add or edit medication records in Airtable</p>

        <div className="searchArea">
          <div className="searchBox">
            <span className="magnifier">⌕</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search records to edit..."
              autoFocus
            />
            {query && <button type="button" onClick={() => setQuery("")}>×</button>}
          </div>
        </div>

        <p className="helper">{status}</p>
        <button className="newButton" type="button" onClick={startCreate}>Add medication</button>
      </section>

      <section className="results">
        <p className="count">{results.length.toLocaleString()} admin result{results.length === 1 ? "" : "s"}</p>

        {results.map(record => (
          <article className="result" key={record.id}>
            <h2>{record["Generic Name"] || "Unnamed record"} {record["Brand Name"] ? <span>({record["Brand Name"]})</span> : null}</h2>
            <p className="green">{record["Route"]} {record["UMMS Formulary Status"] ? `· ${record["UMMS Formulary Status"]}` : ""}</p>
            {record["Notes"] && <p>{record["Notes"]}</p>}
            {record["Therapeutic Interchanges"] && <p><strong>Therapeutic Interchange:</strong> {record["Therapeutic Interchanges"]}</p>}
            <button type="button" onClick={() => startEdit(record)}>Edit this record</button>
          </article>
        ))}
      </section>

      <section className="editor">
        <h2>{selectedRecord ? "Edit medication" : "Add medication"}</h2>
        <form onSubmit={saveMedication}>
          {FIELDS.map(field => (
            <label key={field}>
              {field}
              {field === "Notes" || field === "Therapeutic Interchanges" ? (
                <textarea
                  value={form[field]}
                  onChange={event => setForm({ ...form, [field]: event.target.value })}
                  rows={4}
                />
              ) : (
                <input
                  value={form[field]}
                  onChange={event => setForm({ ...form, [field]: event.target.value })}
                />
              )}
            </label>
          ))}

          <label>
            Edit key, if configured
            <input
              value={editKey}
              onChange={event => setEditKey(event.target.value)}
              placeholder="Leave blank if no EDIT_KEY is set"
            />
          </label>

          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save medication"}</button>
        </form>
      </section>
    </main>
  );
}
