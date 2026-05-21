"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";

const FIELDS = [
  "Generic Name",
  "Brand Name",
  "Route",
  "UMMS Formulary Status",
  "Notes",
  "Therapeutic Interchanges"
];

function clean(value) {
  return String(value || "");
}

export default function Home() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading Airtable records...");

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
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [records]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return fuse.search(q).slice(0, 50).map(result => result.item);
  }, [fuse, query]);

  return (
    <main>
      <section className="home">
        <h1>UMMS Formulary Search</h1>
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

        <p className="helper">{status}</p>
      </section>

      {query.trim() && (
        <section className="results">
          <p className="count">{results.length.toLocaleString()} displayed result{results.length === 1 ? "" : "s"}</p>

          {results.length === 0 ? (
            <div className="empty">No matching records found.</div>
          ) : (
            results.map(record => (
              <article className="result" key={record.id}>
                <h2>{record["Generic Name"] || "Unnamed record"} {record["Brand Name"] ? <span>({record["Brand Name"]})</span> : null}</h2>
                <p className="green">{record["Route"]} {record["UMMS Formulary Status"] ? `· ${record["UMMS Formulary Status"]}` : ""}</p>
                {record["Notes"] && <p>{record["Notes"]}</p>}
                {record["Therapeutic Interchanges"] && <p><strong>Therapeutic Interchange:</strong> {record["Therapeutic Interchanges"]}</p>}
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
