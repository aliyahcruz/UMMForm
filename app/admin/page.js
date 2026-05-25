"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";

const MED_FIELDS = ["Medication ID", "Generic Name", "Brand Name", "Notes", "Therapeutic Interchanges"];
const ROUTE_FIELDS = ["Medication", "Medication ID", "Generic Name", "Brand Name", "Route", "Location", "UMMS Formulary Status", "Notes", "Therapeutic Interchanges"];
const EMPTY_MED = Object.fromEntries(MED_FIELDS.map(field => [field, ""]));
const EMPTY_ROUTE = Object.fromEntries(ROUTE_FIELDS.map(field => [field, ""]));

function clean(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "");
}

function getFields(record, fields) {
  return Object.fromEntries(fields.map(field => [field, clean(record?.[field])]));
}

export default function AdminPage() {
  const [tab, setTab] = useState("medications");
  const [medications, setMedications] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [medForm, setMedForm] = useState(EMPTY_MED);
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE);
  const [editKey, setEditKey] = useState("");
  const [status, setStatus] = useState("Loading admin records...");
  const [saving, setSaving] = useState(false);

  async function loadAdminData() {
    const [medResponse, routeResponse] = await Promise.all([
      fetch("/api/admin/medications", { cache: "no-store" }),
      fetch("/api/admin/routes", { cache: "no-store" })
    ]);

    const medData = await medResponse.json();
    const routeData = await routeResponse.json();

    if (!medResponse.ok) return setStatus(medData.error || "Unable to load medications.");
    if (!routeResponse.ok) return setStatus(routeData.error || "Unable to load routes.");

    setMedications(medData.records || []);
    setRoutes(routeData.records || []);
    setStatus(`${(medData.records || []).length.toLocaleString()} medications and ${(routeData.records || []).length.toLocaleString()} routes loaded.`);
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const medFuse = useMemo(() => new Fuse(medications, {
    keys: ["Medication ID", "Generic Name", "Brand Name", "Notes", "Therapeutic Interchanges"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [medications]);

  const routeFuse = useMemo(() => new Fuse(routes, {
    keys: ["Medication ID", "Generic Name", "Brand Name", "Route", "Location", "UMMS Formulary Status", "Notes", "Therapeutic Interchanges"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [routes]);

  const medResults = useMemo(() => {
    const q = query.trim();
    return q ? medFuse.search(q).slice(0, 25).map(r => r.item) : medications.slice(0, 25);
  }, [query, medications, medFuse]);

  const routeResults = useMemo(() => {
    const q = query.trim();
    return q ? routeFuse.search(q).slice(0, 25).map(r => r.item) : routes.slice(0, 25);
  }, [query, routes, routeFuse]);

  async function save(type, event) {
    event.preventDefault();
    setSaving(true);
    setStatus("Saving...");

    const isMed = type === "med";
    const selected = isMed ? selectedMedication : selectedRoute;
    const form = isMed ? medForm : routeForm;
    const base = isMed ? "/api/admin/medications" : "/api/admin/routes";
    const url = selected?.id ? `${base}/${selected.id}` : base;

    const fields = { ...form };
    if (!fields["Medication"]) delete fields["Medication"];

    const response = await fetch(url, {
      method: selected?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, editKey })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) return setStatus(data.error || "Save failed.");
    setStatus("Saved.");
    await loadAdminData();
  }

  return (
    <main>
      <section className="home adminHome">
        <p className="adminNav"><Link href="/">← Back to public search</Link></p>
        <h1>Formulary Admin</h1>
        <p className="subtitle">Manage Medications, Routes, Locations, and Statuses</p>

        <div className="searchArea">
          <div className="searchBox">
            <span className="magnifier">⌕</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search admin records..." autoFocus />
            {query && <button type="button" onClick={() => setQuery("")}>×</button>}
          </div>
        </div>

        <p className="helper">{status}</p>

        <div className="adminTabs">
          <button type="button" className={tab === "medications" ? "active" : ""} onClick={() => setTab("medications")}>Medications</button>
          <button type="button" className={tab === "routes" ? "active" : ""} onClick={() => setTab("routes")}>Routes / Locations</button>
        </div>
      </section>

      {tab === "medications" && (
        <>
          <section className="editor">
            <h2>{selectedMedication ? "Edit medication" : "Add medication"}</h2>
            <form onSubmit={event => save("med", event)}>
              {MED_FIELDS.map(field => (
                <label key={field}>
                  {field}
                  {field.includes("Notes") || field.includes("Interchanges") ? (
                    <textarea value={medForm[field]} onChange={event => setMedForm({ ...medForm, [field]: event.target.value })} rows={4} />
                  ) : (
                    <input value={medForm[field]} onChange={event => setMedForm({ ...medForm, [field]: event.target.value })} />
                  )}
                </label>
              ))}

              <label>Edit key, if configured<input value={editKey} onChange={event => setEditKey(event.target.value)} /></label>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save medication"}</button>
              <button type="button" onClick={() => { setSelectedMedication(null); setMedForm(EMPTY_MED); }}>Clear / add new</button>
            </form>
          </section>

          <section className="results">
            {medResults.map(record => (
              <article className="result" key={record.id}>
                <h2>{record["Generic Name"] || "Unnamed medication"} {record["Brand Name"] ? <span>({record["Brand Name"]})</span> : null}</h2>
                {record["Medication ID"] && <p className="green">{record["Medication ID"]}</p>}
                <button type="button" onClick={() => { setSelectedMedication(record); setMedForm(getFields(record, MED_FIELDS)); }}>Edit medication</button>
              </article>
            ))}
          </section>
        </>
      )}

      {tab === "routes" && (
        <>
          <section className="editor">
            <h2>{selectedRoute ? "Edit route/location/status" : "Add route/location/status"}</h2>
            <form onSubmit={event => save("route", event)}>
              {ROUTE_FIELDS.map(field => (
                <label key={field}>
                  {field}
                  {field.includes("Notes") || field.includes("Interchanges") ? (
                    <textarea value={routeForm[field]} onChange={event => setRouteForm({ ...routeForm, [field]: event.target.value })} rows={4} />
                  ) : (
                    <input value={routeForm[field]} onChange={event => setRouteForm({ ...routeForm, [field]: event.target.value })} />
                  )}
                </label>
              ))}

              <label>Edit key, if configured<input value={editKey} onChange={event => setEditKey(event.target.value)} /></label>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save route/location/status"}</button>
              <button type="button" onClick={() => { setSelectedRoute(null); setRouteForm(EMPTY_ROUTE); }}>Clear / add new</button>
            </form>
          </section>

          <section className="results">
            {routeResults.map(record => (
              <article className="result" key={record.id}>
                <h2>{record["Generic Name"] || record["Medication ID"] || "Route record"}</h2>
                <p className="green">
                  {record["Route"] || "No route"} {record["Location"] ? `· ${record["Location"]}` : ""} {record["UMMS Formulary Status"] ? `· ${record["UMMS Formulary Status"]}` : ""}
                </p>
                <button type="button" onClick={() => { setSelectedRoute(record); setRouteForm(getFields(record, ROUTE_FIELDS)); }}>Edit route/location/status</button>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
