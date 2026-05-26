"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";

const HIDDEN_EDIT_FIELDS = new Set(["id"]);

const MEDICATION_ADMIN_FIELDS = [
  "Medication ID",
  "Generic Name",
  "Brand Name",
  "Notes",
  "Therapeutic Interchanges",
  "DailyMed URL",
  "DailyMed Set ID"
];

const ROUTES_ADMIN_FIELDS = [
  "Medication ID",
  "Generic Name",
  "Brand Name",
  "Route",
  "Location",
  "UMMS Formulary Status",
  "Status",
  "Notes",
  "Therapeutic Interchanges"
];

const UMM_FORMULARY_ADMIN_FIELDS = [
  "Medication ID",
  "Generic Name",
  "Brand Name",
  "Route",
  "Location",
  "UMMS Formulary Status",
  "Status",
  "Therapeutic Class",
  "MOA",
  "Indication(s)",
  "Frequency",
  "Dosing",
  "Infusion Time",
  "Infusion TIme",
  "Pre-medications",
  "Pre-Medications",
  "REMs Program",
  "HZD Status",
  "Pharmacy Considerations",
  "Preparation",
  "Peds, Renal, Liver, etc Considerations",
  "Peds Renal Liver Considerations",
  "Pretreatment Screening Requirements",
  "Ongoing Treatment Parameters",
  "1st Lifetime Dose in HOPD",
  "Nursing Considerations"
];

function clean(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value || "");
}

function editableFields(record, preferredFields = []) {
  const existing = Object.keys(record || {})
    .filter(key => !HIDDEN_EDIT_FIELDS.has(key))
    .filter(key => key !== "Medication");

  return Array.from(new Set([...preferredFields, ...existing]))
    .filter(key => !HIDDEN_EDIT_FIELDS.has(key))
    .filter(key => key !== "Medication")
    .sort((a, b) => {
      const aIndex = preferredFields.indexOf(a);
      const bIndex = preferredFields.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
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
  const medRecordId = String(med?.id || "");
  const medId = String(med?.["Medication ID"] || "").trim();
  const generic = String(med?.["Generic Name"] || "").trim().toLowerCase();
  const brand = String(med?.["Brand Name"] || "").trim().toLowerCase();

  return (related || []).filter(record => {
    const linkedMedication = record["Medication"];

    if (Array.isArray(linkedMedication) && medRecordId && linkedMedication.includes(medRecordId)) {
      return true;
    }

    const relatedMedId = String(record["Medication ID"] || "").trim();
    const relatedGeneric = String(record["Generic Name"] || "").trim().toLowerCase();
    const relatedBrand = String(record["Brand Name"] || "").trim().toLowerCase();

    if (medId && relatedMedId && medId === relatedMedId) return true;

    if (generic && relatedGeneric && generic === relatedGeneric) {
      if (!brand || !relatedBrand || brand === relatedBrand) return true;
    }

    return false;
  });
}

function RecordEditor({ title, endpointBase, tableName, record, editKey, adminName, parentMedication, preferredFields = [], onSaved, versionHistory = [] }) {
  const fields = editableFields(record, preferredFields);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const initialForm = Object.fromEntries(fields.map(field => [field, clean(record?.[field])]));

    if (parentMedication) {
      if (fields.includes("Medication ID") && !initialForm["Medication ID"]) {
        initialForm["Medication ID"] = clean(parentMedication["Medication ID"]);
      }
      if (fields.includes("Generic Name") && !initialForm["Generic Name"]) {
        initialForm["Generic Name"] = clean(parentMedication["Generic Name"]);
      }
      if (fields.includes("Brand Name") && !initialForm["Brand Name"]) {
        initialForm["Brand Name"] = clean(parentMedication["Brand Name"]);
      }
    }

    setForm(initialForm);
    setMessage("");
    setNote("");
  }, [record?.id]);

  function changedFieldsSummary(fieldsToSend) {
    const rows = Object.entries(fieldsToSend || {})
      .filter(([field]) => field !== "Medication")
      .map(([field, newValue]) => {
        const oldValue = clean(record?.[field]);
        const nextValue = clean(newValue);
        if (oldValue === nextValue) return "";
        return `${field}: "${oldValue || "blank"}" → "${nextValue || "blank"}"`;
      })
      .filter(Boolean);

    return rows.length ? rows.join("\\n") : "No field differences detected.";
  }

  function metadataPayload(action, fieldsToSend) {
    return {
      tableName,
      recordId: record.id,
      medicationId: record["Medication ID"] || "",
      genericName: record["Generic Name"] || "",
      brandName: record["Brand Name"] || "",
      action,
      note,
      changeSummary: changedFieldsSummary(fieldsToSend),
      fields: fieldsToSend,
      submittedBy: adminName,
      reviewedBy: adminName,
      editKey
    };
  }

  async function save(event) {
    event.preventDefault();

    if (!String(adminName || "").trim()) {
      setMessage("Admin name is required before saving changes.");
      return;
    }

    setSaving(true);
    setMessage("Saving to Airtable...");

    const response = await fetch(`${endpointBase}/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: form, editKey })
    });

    const data = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(data.error || "Save failed.");
      return;
    }

    await fetch("/api/admin/version-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadataPayload("Saved to Airtable", form))
    }).catch(() => null);

    setSaving(false);
    setMessage("Saved to Airtable.");
    onSaved?.();
  }

  async function pendChanges() {
    if (!String(adminName || "").trim()) {
      setMessage("Admin name is required before pending changes.");
      return;
    }

    setSaving(true);
    setMessage("Saving as pending...");

    const response = await fetch("/api/admin/pending-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadataPayload("Pending Change Created", form))
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Unable to save pending change.");
      return;
    }

    setMessage("Pending change saved for admin review only. Submitted By has been recorded. It will NOT appear on the public front end until Save to Airtable is selected.");
    onSaved?.();
  }

  const recordHistory = versionHistory.filter(item =>
    String(item["Record ID"] || "") === String(record.id)
  );

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

        <label>
          Change note / reason
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={2}
            placeholder="Optional note for version history"
          />
        </label>

        <div className="adminButtonRow">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save to Airtable"}</button>
          <button type="button" disabled={saving} onClick={pendChanges}>{saving ? "Saving..." : "Pend change for admin review"}</button>
        </div>

        {message && <p className="helper">{message}</p>}
      </form>

      <details className="versionHistoryBox">
        <summary>Version history ({recordHistory.length})</summary>
        {recordHistory.length === 0 ? (
          <p className="helper">No version history found for this record.</p>
        ) : (
          recordHistory.map(item => (
            <div className="versionHistoryItem" key={item.id}>
              <strong>{item["Action"] || "Change"}</strong>
              {item["Change Note"] && <p>{item["Change Note"]}</p>}
              {item["Fields JSON"] && <pre>{item["Fields JSON"]}</pre>}
            </div>
          ))
        )}
      </details>
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
  const [adminName, setAdminName] = useState("");
  const [status, setStatus] = useState("Loading admin records...");
  const [ummQuery, setUmmQuery] = useState("");
  const [selectedUmmRecord, setSelectedUmmRecord] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);

  async function loadAdminData() {
    setStatus("Loading admin records...");

    const [medResponse, routeResponse, ummResponse, historyResponse, pendingResponse] = await Promise.all([
      fetch("/api/admin/medications", { cache: "no-store" }),
      fetch("/api/admin/routes", { cache: "no-store" }),
      fetch("/api/admin/umm-formulary", { cache: "no-store" }),
      fetch("/api/admin/version-history", { cache: "no-store" }),
      fetch("/api/admin/pending-changes", { cache: "no-store" })
    ]);

    const medData = await medResponse.json();
    const routeData = await routeResponse.json();
    const ummData = await ummResponse.json();
    const historyData = await historyResponse.json();
    const pendingData = await pendingResponse.json();

    if (!medResponse.ok) return setStatus(medData.error || "Unable to load medications.");
    if (!routeResponse.ok) return setStatus(routeData.error || "Unable to load routes.");
    if (!ummResponse.ok) return setStatus(ummData.error || "Unable to load UMM Formulary.");

    setMedications(medData.records || []);
    setRoutes(routeData.records || []);
    setUmmRecords(ummData.records || []);
    setVersionHistory(historyData.records || []);
    setPendingChanges(pendingData.records || []);
    setStatus(`${(medData.records || []).length.toLocaleString()} medications loaded. ${(pendingData.records || []).length.toLocaleString()} pending change records found.`);
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

  const selectedRoutes = useMemo(() => (
    medicationMatchesRelated(selectedMed, routes)
      .filter(record => record.Source !== "UMM Formulary" && record.source !== "UMM Formulary")
  ), [selectedMed, routes]);
  const selectedUmm = useMemo(() => medicationMatchesRelated(selectedMed, ummRecords), [selectedMed, ummRecords]);

  const ummFuse = useMemo(() => new Fuse(ummRecords, {
    keys: ["Medication ID", "Generic Name", "Brand Name", "Therapeutic Class", "MOA", "Indication(s)", "Dosing", "Route"],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [ummRecords]);

  const ummSearchResults = useMemo(() => {
    const q = ummQuery.trim();
    if (!q) return ummRecords.slice(0, 25);
    return ummFuse.search(q).slice(0, 25).map(result => result.item);
  }, [ummQuery, ummRecords, ummFuse]);

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

        <div className="adminInlineFields">
          <label className="editKeyInline">
            Edit key, if configured
            <input value={editKey} onChange={event => setEditKey(event.target.value)} />
          </label>

          <label className="editKeyInline">
            Admin name
            <input
              value={adminName}
              onChange={event => setAdminName(event.target.value)}
              placeholder="Name for Submitted By / Reviewed By"
              required
            />
          </label>
        </div>

        <p className="helper">{status}</p>
      </section>

      {!selectedMed ? (
        <>
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

          <section className="adminRelatedBlock">
            <h3>Edit UMM Formulary records directly</h3>
            <p className="helper">Use this if a UMM Formulary record is not linked to the selected medication yet.</p>
            <div className="searchBox adminMiniSearch">
              <span className="magnifier">⌕</span>
              <input
                value={ummQuery}
                onChange={event => setUmmQuery(event.target.value)}
                placeholder="Search UMM Formulary records..."
              />
              {ummQuery && <button type="button" onClick={() => setUmmQuery("")}>×</button>}
            </div>

            {selectedUmmRecord ? (
              <>
                <button type="button" className="adminSmallButton" onClick={() => setSelectedUmmRecord(null)}>← Back to UMM records</button>
                <RecordEditor
                  title={getRecordSearchText(selectedUmmRecord) || "UMM Formulary record"}
                  endpointBase="/api/admin/umm-formulary"
                  tableName="UMM Formulary"
                  record={selectedUmmRecord}
                  editKey={editKey}
                  adminName={adminName}
                  preferredFields={UMM_FORMULARY_ADMIN_FIELDS}
                  versionHistory={versionHistory}
                  onSaved={loadAdminData}
                />
              </>
            ) : (
              <div className="adminCompactList">
                {ummSearchResults.map(record => (
                  <article className="result" key={record.id}>
                    <h2>{getRecordSearchText(record) || "UMM Formulary record"}</h2>
                    <button type="button" onClick={() => setSelectedUmmRecord(record)}>Edit UMM Formulary Record</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="adminEditorScreen">
          <div className="adminEditorHeader">
            <button type="button" onClick={() => setSelectedMed(null)}>← Back to search results</button>
            <h2>{getMedicationTitle(selectedMed)}</h2>
          </div>

          <RecordEditor
            title="Medications table"
            endpointBase="/api/admin/medications"
            tableName="Medications"
            record={selectedMed}
            editKey={editKey}
            adminName={adminName}
            preferredFields={MEDICATION_ADMIN_FIELDS}
            versionHistory={versionHistory}
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
                  tableName="Routes"
                  record={record}
                  editKey={editKey}
                  adminName={adminName}
                  parentMedication={selectedMed}
                  preferredFields={ROUTES_ADMIN_FIELDS}
                  versionHistory={versionHistory}
                  onSaved={loadAdminData}
                />
              ))}
            </section>
          )}

          <section className="adminRelatedBlock">
            <h3>UMM Formulary table</h3>
            {selectedUmm.length > 0 ? (
              selectedUmm.map(record => (
                <RecordEditor
                  key={record.id}
                  title={getRecordSearchText(record) || "UMM Formulary record"}
                  endpointBase="/api/admin/umm-formulary"
                  tableName="UMM Formulary"
                  record={record}
                  editKey={editKey}
                  adminName={adminName}
                  parentMedication={selectedMed}
                  preferredFields={UMM_FORMULARY_ADMIN_FIELDS}
                  versionHistory={versionHistory}
                  onSaved={loadAdminData}
                />
              ))
            ) : (
              <p className="helper">No linked UMM Formulary record found for this medication. Make sure the UMM Formulary row has a linked Medication field, matching Medication ID, or matching Generic/Brand name. You can also go back and use the direct UMM Formulary search.</p>
            )}
          </section>
        </section>
      )}

      
          {pendingChanges.length > 0 && (
            <section className="adminRelatedBlock">
              <h3>Pending changes for admin review only</h3>
              <p className="helper">These pending changes are not shown on the public front end. Use Save to Airtable on a record to publish an approved change.</p>
              {pendingChanges.map(record => (
                <div className="versionHistoryItem" key={record.id}>
                  <strong>{record["Table Name"] || "Table"} · {record["Generic Name"] || record["Medication ID"] || record["Record ID"]}</strong>
                  {record["Change Note"] && <p>{record["Change Note"]}</p>}
                  {record["Change Summary"] && <pre>{record["Change Summary"]}</pre>}
                  {!record["Change Summary"] && record["Fields JSON"] && <pre>{record["Fields JSON"]}</pre>}
                </div>
              ))}
            </section>
          )}

      <p className="versionMarker">Pending admin-only v6.1</p>
      <p className="versionMarker">Admin clean pending v6.5</p>
    </main>
  );
}
