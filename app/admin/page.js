"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";

const HIDDEN_EDIT_FIELDS = new Set(["id"]);

function clean(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value || "");
}

function editableFields(record) {
  return Object.keys(record || {})
    .filter(key => !HIDDEN_EDIT_FIELDS.has(key))
    .filter(key => key !== "Medication")
    .sort((a, b) => a.localeCompare(b));
}

function getMedicationTitle(record) {
  const generic = record?.["Generic Name"] || "Unnamed medication";
  const brand = record?.["Brand Name"];
  return brand ? `${generic} (${brand})` : generic;
}

function getRecordSearchText(record) {
  return [
    record["Medication ID"],
    record["Generic Name"],
    record["Brand Name"],
    record["Route"],
    record["Location"],
    record["UMMS Formulary Status"],
    record["Status"]
  ].filter(Boolean).join(" ");
}

function medicationMatchesRelated(med, related) {
  const medId = String(med?.["Medication ID"] || "");
  const generic = String(med?.["Generic Name"] || "").trim().toLowerCase();
  const brand = String(med?.["Brand Name"] || "").trim().toLowerCase();

  return (related || []).filter(record => {
    const relatedMedId = String(record["Medication ID"] || "");
    const relatedGeneric = String(record["Generic Name"] || "").trim().toLowerCase();
    const relatedBrand = String(record["Brand Name"] || "").trim().toLowerCase();

    if (medId && relatedMedId && medId === relatedMedId) return true;
    if (generic && relatedGeneric && generic === relatedGeneric) {
      if (!brand || !relatedBrand || brand === relatedBrand) return true;
    }

    return false;
  });
}

function RecordEditor({ title, endpointBase, record, editKey, onSaved }) {
  const fields = editableFields(record);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(Object.fromEntries(fields.map(field => [field, clean(record[field])])));
    setMessage("");
  }, [record?.id]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving...");

    const response = await fetch(`${endpointBase}/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: form, editKey })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Save failed.");
      return;
    }

    setMessage("Saved.");
    onSaved?.();
  }

  return (
    <section className="adminEditCard">
      <h3>{title}</h3>
      <form onSubmit={save} className="adminEditForm">
        {fields.map(field => (
          <label key={field}>
            {field}
            <textarea
              value={form[field] || ""}
              onChange={event => setForm({ ...form, [field]: event.target.value })}
              rows={String(form[field] || "").length > 80 ? 4 : 2}
            />
          </label>
        ))}

        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        {message && <p className="helper">{message}</p>}
      </form>
    </section>
  );
}

export default function AdminPage() {
  const [medications, setMedications] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [ummRecords, setUmmRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedMed, setSelectedMed] = useState(null);
  const [editKey, setEditKey] = useState("");
  const [status, setStatus] = useState("Loading admin records...");

  async function loadAdminData() {
    setStatus("Loading admin records...");

    const [medResponse, routeResponse, ummResponse] = await Promise.all([
      fetch("/api/admin/medications", { cache: "no-store" }),
      fetch("/api/admin/routes", { cache: "no-store" }),
      fetch("/api/admin/umm-formulary", { cache: "no-store" })
    ]);

    const medData = await medResponse.json();
    const routeData = await routeResponse.json();
    const ummData = await ummResponse.json();

    if (!medResponse.ok) return setStatus(medData.error || "Unable to load medications.");
    if (!routeResponse.ok) return setStatus(routeData.error || "Unable to load routes.");
    if (!ummResponse.ok) return setStatus(ummData.error || "Unable to load UMM Formulary.");

    setMedications(medData.records || []);
    setRoutes(routeData.records || []);
    setUmmRecords(ummData.records || []);
    setStatus(`${(medData.records || []).length.toLocaleString()} medications loaded.`);
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const fuse = useMemo(() => new Fuse(medications, {
    keys: ["Medication ID", "Generic Name", "Brand Name", "Notes", "Therapeutic Interchanges"],
    threshold: 0.25,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [medications]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return medications.slice(0, 30);
    return fuse.search(q).slice(0, 30).map(result => result.item);
  }, [query, medications, fuse]);

  const selectedRoutes = useMemo(() => medicationMatchesRelated(selectedMed, routes), [selectedMed, routes]);
  const selectedUmm = useMemo(() => medicationMatchesRelated(selectedMed, ummRecords), [selectedMed, ummRecords]);

  return (
    <main>
      <section className="home adminHome">
        <p className="adminNav"><Link href="/">← Back to public search</Link></p>
        <h1>Formulary Admin</h1>
        <p className="subtitle">Search for a medication, then click Edit Medication.</p>

        <div className="searchArea">
          <div className="searchBox">
            <span className="magnifier">⌕</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search generic or brand name..."
              autoFocus
            />
            {query && <button type="button" onClick={() => setQuery("")}>×</button>}
          </div>
        </div>

        <label className="editKeyInline">
          Edit key, if configured
          <input value={editKey} onChange={event => setEditKey(event.target.value)} />
        </label>

        <p className="helper">{status}</p>
      </section>

      {!selectedMed ? (
        <section className="results">
          <p className="count">{results.length} medication result{results.length === 1 ? "" : "s"}</p>

          {results.map(record => (
            <article className="result" key={record.id}>
              <h2>{getMedicationTitle(record)}</h2>
              {record["Medication ID"] && <p className="green">{record["Medication ID"]}</p>}
              <button type="button" onClick={() => setSelectedMed(record)}>Edit Medication</button>
            </article>
          ))}
        </section>
      ) : (
        <section className="adminEditorScreen">
          <div className="adminEditorHeader">
            <button type="button" onClick={() => setSelectedMed(null)}>← Back to search results</button>
            <h2>{getMedicationTitle(selectedMed)}</h2>
          </div>

          <RecordEditor
            title="Medications table"
            endpointBase="/api/admin/medications"
            record={selectedMed}
            editKey={editKey}
            onSaved={loadAdminData}
          />

          {selectedRoutes.length > 0 && (
            <section className="adminRelatedBlock">
              <h3>Routes table</h3>
              {selectedRoutes.map(record => (
                <RecordEditor
                  key={record.id}
                  title={`${record["Location"] || "Location not listed"} · ${record["Route"] || "Route not listed"} · ${record["UMMS Formulary Status"] || record["Status"] || "Status not listed"}`}
                  endpointBase="/api/admin/routes"
                  record={record}
                  editKey={editKey}
                  onSaved={loadAdminData}
                />
              ))}
            </section>
          )}

          {selectedUmm.length > 0 && (
            <section className="adminRelatedBlock">
              <h3>UMM Formulary table</h3>
              {selectedUmm.map(record => (
                <RecordEditor
                  key={record.id}
                  title={getRecordSearchText(record) || "UMM Formulary record"}
                  endpointBase="/api/admin/umm-formulary"
                  record={record}
                  editKey={editKey}
                  onSaved={loadAdminData}
                />
              ))}
            </section>
          )}
        </section>
      )}

      <p className="versionMarker">Admin search-edit v5.8</p>
    </main>
  );
}
