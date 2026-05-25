"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";

function routeText(medication) {
  return (medication.routes || [])
    .map(route => `${route.route} ${route.location} ${route.status}`)
    .join(" ");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchScore(record, query) {
  const q = normalize(query);
  const generic = normalize(record["Generic Name"]);
  const brand = normalize(record["Brand Name"]);
  const medicationId = normalize(record["Medication ID"]);
  const routes = normalize(routeText(record));

  if (!q) return 999;

  if (generic === q || brand === q || medicationId === q) return 0;
  if (generic.startsWith(q) || brand.startsWith(q)) return 1;
  if (generic.split(" ").some(part => part.startsWith(q)) || brand.split(" ").some(part => part.startsWith(q))) return 2;
  if (generic.includes(q) || brand.includes(q)) return 3;
  if (medicationId.includes(q)) return 4;
  if (q.length >= 3 && routes.includes(q)) return 5;

  const notes = normalize(`${record["Notes"] || ""} ${record["Therapeutic Interchanges"] || ""}`);
  if (q.length >= 5 && notes.includes(q)) return 6;

  return 999;
}

function shouldIncludeRecord(record, query, fuseScore) {
  const q = normalize(query);
  const searchScore = getSearchScore(record, q);

  if (searchScore < 999) return true;

  return q.length >= 4 && typeof fuseScore === "number" && fuseScore <= 0.22;
}

function routeMatchesLocation(route, location) {
  if (!location) return true;
  return String(route.location || "").toLowerCase() === String(location).toLowerCase();
}

function formatDetailValue(value) {
  if (Array.isArray(value)) {
    const cleaned = value
      .map(item => String(item || "").trim())
      .filter(item => item && !/^rec[a-zA-Z0-9]{10,}$/.test(item));

    return cleaned.join(", ");
  }

  if (value && typeof value === "object") return "";

  const text = String(value || "").trim();
  if (/^rec[a-zA-Z0-9]{10,}$/.test(text)) return "";

  return text;
}

function normalizeFieldName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HOME_INFUSION_DETAIL_FIELDS = [
  { label: "Therapeutic Class", aliases: ["Therapeutic Class"] },
  { label: "MOA", aliases: ["MOA", "Mechanism of Action"] },
  { label: "Indication(s)", aliases: ["Indication(s)", "Indications", "Indication"] },
  { label: "Frequency", aliases: ["Frequency"] },
  { label: "Dosing", aliases: ["Dosing", "Dose"] },
  { label: "Infusion Time", aliases: ["Infusion Time", "Infusion TIme", "Infusion time"] },
  { label: "Pre-medications", aliases: ["Pre-medications", "Pre-Medications", "Premedications", "Pre Medications", "Pre-Meds", "Pre Meds"] },
  { label: "REMs Program", aliases: ["REMs Program", "REMS Program", "REMS", "REMs"] },
  { label: "HZD Status", aliases: ["HZD Status", "HZD", "Hazardous Status", "Hazardous Drug Status"] },
  { label: "Pharmacy Considerations", aliases: ["Pharmacy Considerations", "Pharmacy Consideration"] },
  { label: "Preparation", aliases: ["Preparation", "Prep"] },
  { label: "Peds, Renal, Liver, etc Considerations", aliases: ["Peds, Renal, Liver, etc Considerations", "Peds Renal Liver Considerations", "Peds Renal Liver", "Peds/Renal/Liver Considerations", "Pediatric Renal Liver Considerations", "Peds, Renal, Live, etc Considerations"] },
  { label: "Pretreatment Screening Requirements", aliases: ["Pretreatment Screening Requirements", "Pretreatment Screening", "Pretreatment", "Pre-treatment", "Pre Treatment"] },
  { label: "Ongoing Treatment Parameters", aliases: ["Ongoing Treatment Parameters", "Ongoing Treatment", "Monitoring Parameters"] },
  { label: "1st Lifetime Dose in HOPD", aliases: ["1st Lifetime Dose in HOPD", "1st Lifetime Dose", "First Lifetime Dose", "First Dose", "Lifetime Dose"] },
  { label: "Nursing Considerations", aliases: ["Nursing Considerations", "Nursing Consideration"] }
];

function findDetailField(details, aliases) {
  const entries = Object.entries(details || {});
  const normalizedAliases = aliases.map(normalizeFieldName);

  for (const [key, value] of entries) {
    if (normalizedAliases.includes(normalizeFieldName(key))) return value;
  }

  for (const [key, value] of entries) {
    const normalizedKey = normalizeFieldName(key);
    if (normalizedAliases.some(alias => normalizedKey.includes(alias) || alias.includes(normalizedKey))) {
      return value;
    }
  }

  return "";
}

function getHomeInfusionDetails(route) {
  if (route.source !== "UMM Formulary" || !route.details) return [];

  return HOME_INFUSION_DETAIL_FIELDS.map(field => ({
    key: field.label,
    value: formatDetailValue(findDetailField(route.details, field.aliases)) || "—"
  }));
}

function getHomeInfusionDetailRows(record, selectedLocation) {
  if (selectedLocation !== "Home Infusion") return [];

  return (record.routes || [])
    .filter(route => route.source === "UMM Formulary")
    .map(route => ({
      id: route.id,
      details: getHomeInfusionDetails(route)
    }))
    .filter(row => row.details.length > 0);
}

function getVisibleRouteRows(record, selectedLocation) {
  const routes = record.routes || [];

  return routes.filter(route => {
    if (route.source === "UMM Formulary") return false;

    if (selectedLocation === "Home Infusion") {
      const routeText = String(route.route || "").trim().toLowerCase();
      const statusText = String(route.status || "").trim().toLowerCase();

      if (!routeText || routeText === "home infusion") return false;
      if (!statusText || statusText === "status not listed") return false;
    }

    return true;
  });
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
      const response = await fetch("/api/records");
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
      { name: "Generic Name", weight: 0.65 },
      { name: "Brand Name", weight: 0.30 },
      { name: "Medication ID", weight: 0.05 }
    ],
    includeScore: true,
    threshold: 0.22,
    distance: 80,
    ignoreLocation: true,
    minMatchCharLength: 3
  }), [locationFilteredRecords]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const directMatches = locationFilteredRecords
      .map(record => ({ record, score: getSearchScore(record, q) }))
      .filter(item => item.score < 999);

    const fuzzyMatches = fuse.search(q)
      .filter(result => shouldIncludeRecord(result.item, q, result.score))
      .map(result => ({
        record: result.item,
        score: getSearchScore(result.item, q) < 999 ? getSearchScore(result.item, q) : 10 + (result.score || 0)
      }));

    const seen = new Set();

    return [...directMatches, ...fuzzyMatches]
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return String(a.record["Generic Name"] || "").localeCompare(String(b.record["Generic Name"] || ""), undefined, { sensitivity: "base" });
      })
      .filter(item => {
        if (seen.has(item.record.id)) return false;
        seen.add(item.record.id);
        return true;
      })
      .slice(0, 50)
      .map(item => item.record);
  }, [fuse, query, locationFilteredRecords]);

  return (
    <main>
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
                    {getVisibleRouteRows(record, selectedLocation).length > 0 && (
                      <>
                        <strong>{selectedLocation ? "Route / Status" : "Location / Route / Status"}</strong>
                        <div className={selectedLocation ? "routeTable noLocationColumn" : "routeTable"}>
                          <div className={selectedLocation ? "routeTableHeader noLocationColumn" : "routeTableHeader"}>
                            {!selectedLocation && <span>Location</span>}
                            <span>Route</span>
                            <span>Status</span>
                          </div>

                          {getVisibleRouteRows(record, selectedLocation).map(route => (
                            <div className={selectedLocation ? "routeTableRow noLocationColumn" : "routeTableRow"} key={route.id}>
                              {!selectedLocation && <span>{route.location || "All / not listed"}</span>}
                              <span>{route.route || "Route not listed"}</span>
                              <span>{route.status || "Status not listed"}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedLocation === "Home Infusion" && getHomeInfusionDetailRows(record, selectedLocation).length > 0 && (
                      <div className="homeInfusionDetails">
                        <strong>Home Infusion Details</strong>
                        <div className="homeInfusionDetailsScroll">
                          {getHomeInfusionDetailRows(record, selectedLocation).map(row => (
                            <div className="homeInfusionDetailCard" key={row.id}>
                              <div className="homeInfusionDetailTable">
                                {row.details.map(item => (
                                  <div className="homeInfusionDetailRow" key={item.key}>
                                    <span>{item.key}</span>
                                    <p>{item.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}
      <p className="versionMarker">Home Infusion update v4.1 · HI details below table v4.9 · Removed HI status row v5.0 · Detail-only HI rows v5.1 · Strict HI details v5.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2 · Restore HI details v6.2</p>
    </main>
  );
}
