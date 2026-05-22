"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";

function routeText(medication) {
  return (medication.routes || [])
    .map(route => `${route.route} ${route.location} ${route.status} ${route.notes} ${route.therapeuticInterchanges}`)
    .join(" ");
}

function routeMatchesLocation(route, location) {
  if (!location) return true;
  return String(route.location || "").toLowerCase() === String(location).toLowerCase();
}

function DailyMedLink({ drugName }) {
  const [match, setMatch] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyMed() {
      if (!drugName) return;

      try {
        const response = await fetch(`/api/dailymed?drug=${encodeURIComponent(drugName)}`);
        const data = await response.json();

        if (!cancelled) {
          setMatch(data.match || null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setMatch(null);
          setLoaded(true);
        }
      }
    }

    loadDailyMed();

    return () => {
      cancelled = true;
    };
  }, [drugName]);

  if (!loaded) {
    return <p className="dailyMed loading">Checking DailyMed...</p>;
  }

  if (!match) {
    return null;
  }

  return (
    <p className="dailyMed">
      <a href={match.url} target="_blank" rel="noreferrer">
        View DailyMed Label
      </a>
      <span>{match.confidence}</span>
    </p>
  );
}

export default function Home() {
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [status, setStatus] = useState("Loading records...");

  useEffect(() => {
    async function loadRecords() {
      const response = await fetch("/api/records", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Unable to load records.");
        return;
      }

      setRecords(data.records || []);
      setLocations(data.locations || []);
      setStatus(`${(data.records || []).length.toLocaleString()} medications loaded.`);
    }

    loadRecords();
  }, []);

  const locationFilteredRecords = useMemo(() => {
    if (!selectedLocation) return records;

    return records
      .map(record => ({
        ...record,
        routes: (record.routes || []).filter(route => routeMatchesLocation(route, selectedLocation))
      }))
      .filter(record => record.routes.length > 0);
  }, [records, selectedLocation]);

  const fuse = useMemo(() => new Fuse(locationFilteredRecords, {
    keys: [
      { name: "Generic Name", weight: 0.45 },
      { name: "Brand Name", weight: 0.35 },
      { name: "Medication ID", weight: 0.08 },
      { name: "Notes", weight: 0.05 },
      { name: "Therapeutic Interchanges", weight: 0.04 },
      { name: "routeSearch", getFn: routeText, weight: 0.03 }
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  }), [locationFilteredRecords]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return fuse.search(q).slice(0, 50).map(result => result.item);
  }, [fuse, query]);

  return (
    <main>
      <form action="/auth/signout" method="post" className="signOutForm"><button type="submit">Sign out</button></form>
      <div className="topRightLocation">
        <label>
          Location
          <select value={selectedLocation} onChange={event => setSelectedLocation(event.target.value)}>
            <option value="">All locations</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </label>
      </div>

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

        <p className="helper">
          {status}
          {selectedLocation ? ` Showing formulary records for ${selectedLocation}.` : " Showing all locations."}
        </p>
      </section>

      {query.trim() && (
        <section className="results">
          <p className="count">{results.length.toLocaleString()} displayed result{results.length === 1 ? "" : "s"}</p>

          {results.length === 0 ? (
            <div className="empty">No matching records found.</div>
          ) : (
            results.map(record => (
              <article className="result" key={record.id}>
                <h2>{record["Generic Name"] || "Unnamed medication"} {record["Brand Name"] ? <span>({record["Brand Name"]})</span> : null}</h2>
                {record["Medication ID"] && <p className="green">{record["Medication ID"]}</p>}
                <DailyMedLink drugName={record["Generic Name"]} />
                {record["Notes"] && <p>{record["Notes"]}</p>}
                {record["Therapeutic Interchanges"] && <p><strong>Therapeutic Interchange:</strong> {record["Therapeutic Interchanges"]}</p>}

                {(record.routes || []).length > 0 && (
                  <div className="routeList">
                    <strong>Location / Route / Status</strong>
                    <div className="routeTable">
                      <div className="routeTableHeader">
                        <span>Location</span>
                        <span>Route</span>
                        <span>Status</span>
                      </div>
                      {record.routes.map(route => (
                        <div className="routeTableRow" key={route.id}>
                          <span>{route.location || "All / not listed"}</span>
                          <span>{route.route || "Route not listed"}</span>
                          <span>{route.status || "Status not listed"}</span>
                          {route.notes && <small className="routeNotes">{route.notes}</small>}
                          {route.therapeuticInterchanges && <small className="routeNotes"><b>Interchange:</b> {route.therapeuticInterchanges}</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
