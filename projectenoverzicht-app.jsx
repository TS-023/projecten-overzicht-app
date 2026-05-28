import { useState, useEffect, useRef, useCallback } from "react";

// ─── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL  = "https://rrxglrrrijgfyvinbmwu.supabase.co";
const SUPABASE_ANON = "sb_publishable_xlvYAi683npTSAOLz1CgRw_1HT2EZ-T";

// ─── Colour map for project types (matches mockup pins) ───────────────────
const TYPE_COLORS = {
  Wonen:      "#E8224A",   // pink/red
  Kantoor:    "#F5A623",   // orange
  Gemengd:    "#1B8B5A",   // dark green
  Onderwijs:  "#5CB85C",   // light green
  Zorg:       "#9B59B6",   // purple
  default:    "#9E9E9E",   // grey
};

function typeColor(type) {
  if (!type) return TYPE_COLORS.default;
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return TYPE_COLORS.default;
}

// ─── Tiny Supabase fetch helpers ──────────────────────────────────────────
async function sbFetch(table, select = "*", filters = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  for (const [k, v] of Object.entries(filters)) url += `&${k}=eq.${encodeURIComponent(v)}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ─── Geocode cache ────────────────────────────────────────────────────────
const geocacheKey = "mvsa.geocache.v2";
function geocacheGet(k) {
  try { return JSON.parse(localStorage.getItem(geocacheKey) || "{}")[k] || null; } catch { return null; }
}
function geocacheSet(k, v) {
  try {
    const all = JSON.parse(localStorage.getItem(geocacheKey) || "{}");
    all[k] = v;
    localStorage.setItem(geocacheKey, JSON.stringify(all));
  } catch {}
}
async function geocode(query) {
  if (!query) return null;
  const cached = geocacheGet(query);
  if (cached) return cached;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "Accept-Language": "nl", "User-Agent": "MVSA-App/2.0" } }
    );
    const d = await r.json();
    if (d?.[0]) {
      const v = { lat: +d[0].lat, lng: +d[0].lon };
      geocacheSet(query, v);
      return v;
    }
  } catch {}
  return null;
}

// ─── MapPin SVG ───────────────────────────────────────────────────────────
function PinIcon({ color = "#E8224A", size = 28, active = false }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 24 32" style={{ filter: active ? "drop-shadow(0 4px 8px rgba(0,0,0,.4))" : "drop-shadow(0 2px 4px rgba(0,0,0,.25))", display: "block" }}>
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z" fill={color} />
      <circle cx="12" cy="9" r="3.5" fill="white" />
    </svg>
  );
}

// ─── Logo pin icon ─────────────────────────────────────────────────────────
function LogoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="white" />
      <path d="M20 7C14.48 7 10 11.48 10 17c0 8 10 16 10 16s10-8 10-16c0-5.52-4.48-10-10-10z" fill="#7EC8C0" />
      <circle cx="20" cy="17" r="4" fill="white" />
    </svg>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────
function LoadingScreen({ done }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#7EC8C0",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 9999, transition: "opacity 0.6s", opacity: done ? 0 : 1,
      pointerEvents: done ? "none" : "all",
    }}>
      <div style={{ background: "white", borderRadius: 20, padding: 24, marginBottom: 20 }}>
        <PinIcon color="#7EC8C0" size={44} />
      </div>
      <div style={{ color: "white", letterSpacing: "0.18em", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
        PROJECTENOVERZICHT.NL
      </div>
      <div style={{ position: "absolute", bottom: 40, color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        A GALGENWIBO DESIGN
      </div>
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────
function StatusBar({ onSearch }) {
  return (
    <div style={{ background: "#7EC8C0", padding: "10px 16px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoIcon size={34} />
          <span style={{ color: "white", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            PROJECTENOVERZICHT.NL
          </span>
        </div>
        <button onClick={onSearch}
          style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
          ZOEKEN
        </button>
      </div>
    </div>
  );
}

// ─── Top tab bar ──────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = ["KAART", "LIJST", "UNIVERSE", "PROFIELEN"];
  return (
    <div style={{ background: "#7EC8C0", display: "flex", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          style={{
            flex: 1, background: "none", border: "none", padding: "10px 0 8px",
            color: "white", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: "pointer",
            borderBottom: active === t ? "2px solid white" : "2px solid transparent",
            opacity: active === t ? 1 : 0.7,
          }}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Bottom action bar ────────────────────────────────────────────────────
function BottomBar({ onZoek, onFilter, onFavorieten, onDashboard }) {
  const items = [
    { label: "ZOEKEN", onClick: onZoek },
    { label: "FILTERS", onClick: onFilter },
    { label: "FAVORIETEN", onClick: onFavorieten },
    { label: "DASHBOARD", onClick: onDashboard },
  ];
  return (
    <div style={{
      background: "white", borderTop: "1px solid #e8e4dd",
      display: "flex", padding: "12px 0 20px", flexShrink: 0,
    }}>
      {items.map(it => (
        <button key={it.label} onClick={it.onClick}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#888",
            textTransform: "uppercase",
          }}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ─── Leaflet Map View ─────────────────────────────────────────────────────
function MapView({ projects, onSelectProject }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewProject, setPreviewProject] = useState(null);

  useEffect(() => {
    if (leafletRef.current) return;
    // Load Leaflet dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([52.2, 5.0], 8);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      maxZoom: 19,
    }).addTo(map);
    leafletRef.current = map;
    renderMarkers(projects);
  }, [projects]);

  useEffect(() => {
    if (leafletRef.current) renderMarkers(projects);
  }, [projects]);

  function renderMarkers(projs) {
    const L = window.L;
    if (!L || !leafletRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    projs.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = typeColor(p.project_type || p.functie);
      const icon = L.divIcon({
        className: "",
        html: `<svg width="28" height="36" viewBox="0 0 24 32" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));display:block"><path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z" fill="${color}"/><circle cx="12" cy="9" r="3.5" fill="white"/></svg>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      const m = L.marker([p.lat, p.lng], { icon })
        .addTo(leafletRef.current)
        .on("click", () => {
          setSelectedId(p.id);
          setPreviewProject(p);
        });
      markersRef.current.push(m);
    });
  }

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {/* Project preview card sliding up */}
      {previewProject && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "white", borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          animation: "slideUp 0.3s ease",
          zIndex: 1000,
        }}>
          <button onClick={() => setPreviewProject(null)}
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.1)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>
            ×
          </button>
          {/* Hero image */}
          <div style={{ height: 180, background: "linear-gradient(135deg,#1a2332,#2d3a4a)", position: "relative", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
            {previewProject.thumbUrl
              ? <img src={previewProject.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Geen afbeelding</span>
                </div>
            }
            {/* Orange bar + title */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
              <div style={{ background: typeColor(previewProject.project_type || previewProject.functie), height: 4 }} />
              <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", padding: "24px 16px 12px" }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
                  {previewProject.projectnaam || previewProject.name}
                </div>
              </div>
            </div>
          </div>
          {/* Meta */}
          <div style={{ padding: "14px 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {[
              ["ONTWIKKELAAR", previewProject.opdrachtgever],
              ["METRAGE", previewProject.totaal_bvo ? `${previewProject.totaal_bvo.toLocaleString()} m²` : null],
              ["ARCHITECT", previewProject.architect],
              ["FUNCTIE", previewProject.functie || previewProject.project_type],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#aaa", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2332" }}>{val || "—"}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <button onClick={() => onSelectProject(previewProject)}
              style={{
                width: "100%", background: "#1a2332", color: "white", border: "none", borderRadius: 8,
                padding: "12px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
              }}>
              Open project →
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────
function ProjectCard({ project, size = "large", onClick }) {
  const color = typeColor(project.project_type || project.functie);
  if (size === "small") {
    return (
      <div onClick={() => onClick(project)} style={{
        background: "white", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.06)",
        cursor: "pointer", transition: "transform 0.2s",
      }}>
        <div style={{ height: 120, background: "linear-gradient(135deg,#1a2332,#2d3a4a)", position: "relative", overflow: "hidden" }}>
          {project.thumbUrl && <img src={project.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top,rgba(0,0,0,0.75),transparent)", padding: "24px 10px 8px" }}>
            <div style={{ background: color, height: 3, marginBottom: 4 }} />
            <div style={{ color: "white", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
              {project.projectnaam || project.name}
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 10px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
          {[["ONTWIKKELAAR", project.opdrachtgever], ["METRAGE", project.totaal_bvo ? `${project.totaal_bvo.toLocaleString()} m²` : null],
            ["ARCHITECT", project.architect], ["FUNCTIE", project.functie || project.project_type]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", color: "#bbb", textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1a2332", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // Large card
  return (
    <div onClick={() => onClick(project)} style={{
      background: "white", borderRadius: 16, overflow: "hidden", marginBottom: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,.08), 0 8px 20px rgba(0,0,0,.08)",
      cursor: "pointer",
    }}>
      <div style={{ height: 220, background: "linear-gradient(135deg,#1a2332,#2d3a4a)", position: "relative", overflow: "hidden" }}>
        {project.thumbUrl && <img src={project.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top,rgba(0,0,0,0.75),transparent)", padding: "32px 16px 12px" }}>
          <div style={{ background: color, height: 4, marginBottom: 6 }} />
          <div style={{ color: "white", fontWeight: 800, fontSize: 22, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
            {project.projectnaam || project.name}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
        {[["ONTWIKKELAAR", project.opdrachtgever], ["METRAGE", project.totaal_bvo ? `${project.totaal_bvo.toLocaleString()} m²` : null],
          ["ARCHITECT", project.architect], ["FUNCTIE", project.functie || project.project_type]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "#bbb", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2332" }}>{v || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────
function ListView({ projects, onSelectProject }) {
  const [viewMode, setViewMode] = useState("large"); // large | small
  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* view toggle */}
      <div style={{ padding: "10px 16px 6px", display: "flex", gap: 8 }}>
        {[["large", "≡"], ["small", "⊞"]].map(([v, icon]) => (
          <button key={v} onClick={() => setViewMode(v)}
            style={{
              background: viewMode === v ? "#1a2332" : "white", color: viewMode === v ? "white" : "#888",
              border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", fontSize: 14, cursor: "pointer",
            }}>
            {icon}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa", alignSelf: "center" }}>
          {projects.length} projecten
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 12px" }}>
        {viewMode === "large"
          ? projects.map(p => <ProjectCard key={p.id} project={p} size="large" onClick={onSelectProject} />)
          : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {projects.map(p => <ProjectCard key={p.id} project={p} size="small" onClick={onSelectProject} />)}
            </div>
        }
        {projects.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Geen projecten gevonden</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project Detail Page ──────────────────────────────────────────────────
function ProjectDetail({ project, onBack }) {
  const [activeTab, setActiveTab] = useState("ALGEMEEN");
  const tabs = ["ALGEMEEN", "TEAM", "METRAGE", "PLANNING", "OVERIG"];
  const color = typeColor(project.project_type || project.functie);

  const fields = {
    ALGEMEEN: [
      ["PROJECTNUMMER", project.projectnummer],
      ["PROJECTNAAM", project.projectnaam],
      ["FUNCTIE", project.functie],
      ["PROJECT TYPE", project.project_type],
      ["OPGAVE", project.opgave],
      ["FASE", project.fase],
      ["OPDRACHTGEVER", project.opdrachtgever],
      ["ARCHITECT", project.architect],
      ["STAD", project.stad],
      ["PROVINCIE", project.provincie],
      ["LAND", project.land],
    ],
    TEAM: [
      ["OPDRACHTGEVER", project.opdrachtgever],
      ["GED. OPDRACHTGEVER", project.gedelegeerd_opdrachtgever],
      ["CONTACTPERSOON", project.contactpersoon],
      ["TELEFOON", project.telefoon],
      ["EMAIL", project.email],
    ],
    METRAGE: [
      ["TOTAAL BVO", project.totaal_bvo ? `${project.totaal_bvo.toLocaleString()} m²` : null],
      ["WONEN", project.m_wonen ? `${project.m_wonen.toLocaleString()} m²` : null],
      ["KANTOOR", project.m_kantoor ? `${project.m_kantoor.toLocaleString()} m²` : null],
      ["COMMERCIEEL", project.m_commercieel ? `${project.m_commercieel.toLocaleString()} m²` : null],
      ["SHORTSTAY", project.m_shortstay ? `${project.m_shortstay.toLocaleString()} m²` : null],
      ["PUBLIEK", project.m_publiek ? `${project.m_publiek.toLocaleString()} m²` : null],
      ["ONDERWIJS", project.m_onderwijs ? `${project.m_onderwijs.toLocaleString()} m²` : null],
    ],
    PLANNING: [
      ["OPLEVERDATUM", project.opleverdatum],
      ["VERKREGEN VIA", project.verkregen_dmv],
      ["BOUWHOOGTE", project.bouwhoogte ? `${project.bouwhoogte} m` : null],
    ],
    OVERIG: [
      ["NPG SCORE", project.npg_score],
      ["DAKTUIN", project.daktuin ? `${project.daktuin} m²` : null],
      ["ZONNEPANELEN", project.zonnepanelen ? `${project.zonnepanelen} m²` : null],
      ["DUURZAAMHEIDSLABEL", project.duurzaamheidslabel],
      ["AUTOPARKEREN", project.autoparkeren],
      ["FIETSPARKEREN", project.fietsparkeren],
      ["TEVREDENHEID", project.tevredenheid],
      ["AWARDS", project.awards],
    ],
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f4f6f9" }}>
      {/* Hero */}
      <div style={{ height: 220, background: "linear-gradient(135deg,#1a2332,#2d3a4a)", position: "relative", flexShrink: 0 }}>
        {project.thumbUrl && <img src={project.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <button onClick={onBack}
          style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 16px 0", background: "linear-gradient(to top,rgba(0,0,0,0.7),transparent)" }}>
          <div style={{ background: color, height: 4, marginBottom: 8 }} />
          <div style={{ color: "white", fontWeight: 800, fontSize: 24, textTransform: "uppercase", letterSpacing: "-0.02em", paddingBottom: 12 }}>
            {project.projectnaam}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: "white", display: "flex", borderBottom: "1px solid #eee", flexShrink: 0, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{
              flex: "0 0 auto", background: "none", border: "none", padding: "12px 14px 10px",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", color: activeTab === t ? "#1a2332" : "#aaa",
              borderBottom: activeTab === t ? "2px solid #1a2332" : "2px solid transparent",
              whiteSpace: "nowrap",
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(fields[activeTab] || []).filter(([, v]) => v != null && v !== "").map(([label, val]) => (
            <div key={label} style={{ display: "flex", padding: "10px 4px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ width: "45%", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#aaa", textTransform: "uppercase" }}>
                {label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2332" }}>{val}</div>
            </div>
          ))}
        </div>
        {(fields[activeTab] || []).filter(([, v]) => v != null && v !== "").length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#ccc", fontSize: 13 }}>Geen data beschikbaar</div>
        )}
      </div>

      {/* Edit button */}
      <div style={{ padding: "12px 16px 16px", background: "white", borderTop: "1px solid #eee", flexShrink: 0 }}>
        <button style={{
          float: "right", background: "#e8e8e8", border: "none", borderRadius: 8,
          padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#666", cursor: "pointer",
        }}>
          BEWERKEN
        </button>
        <div style={{ clear: "both" }} />
      </div>
    </div>
  );
}

// ─── Profiles View ────────────────────────────────────────────────────────
function ProfilesView({ contacts }) {
  const [filterType, setFilterType] = useState("bedrijven");
  const filters = ["bedrijven", "labels", "awards"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Filter pills */}
      <div style={{ padding: "12px 12px 8px", display: "flex", gap: 8, alignItems: "center", background: "white", borderBottom: "1px solid #eee" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilterType(f)}
            style={{
              background: filterType === f ? "#1a2332" : "white",
              color: filterType === f ? "white" : "#888",
              border: "1px solid #ddd", borderRadius: 999, padding: "6px 14px",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>
            {f}
          </button>
        ))}
        <button style={{ marginLeft: "auto", background: "#7EC8C0", border: "none", borderRadius: "50%", width: 30, height: 30, color: "white", fontSize: 18, cursor: "pointer" }}>+</button>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {contacts.map((c, i) => (
          <div key={i} style={{
            background: "white", borderRadius: 12, padding: 16, marginBottom: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,.06)", borderLeft: "4px solid #5CB85C",
            display: "flex", gap: 12, cursor: "pointer",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2, color: "#1a2332" }}>{c.naam || c.company}</div>
              <div style={{ fontSize: 12, color: "#7EC8C0", marginBottom: 8 }}>{c.rol || c.type}</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
                {c.straat && <div>{c.straat} {c.huisnummer}</div>}
                {c.stad && <div>{c.stad}</div>}
                {c.postcode && <div>{c.postcode}</div>}
                {c.email && <div style={{ marginTop: 6 }}>{c.email}</div>}
                {c.telefoon && <div>{c.telefoon}</div>}
              </div>
            </div>
            {/* Avatar placeholder */}
            <div style={{ width: 60, height: 60, background: "#7a8a9a", borderRadius: 8, flexShrink: 0 }} />
          </div>
        ))}
        {contacts.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div>Geen contacten gevonden</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Universe placeholder ─────────────────────────────────────────────────
function UniverseView() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#f4f6f9" }}>
      <div style={{ fontSize: 48 }}>🌐</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2332" }}>Universe</div>
      <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", maxWidth: 200 }}>Network visualisatie van alle verbindingen</div>
    </div>
  );
}

// ─── Search overlay ───────────────────────────────────────────────────────
function SearchOverlay({ projects, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = q.length > 1
    ? projects.filter(p =>
        (p.projectnaam || "").toLowerCase().includes(q.toLowerCase()) ||
        (p.stad || "").toLowerCase().includes(q.toLowerCase()) ||
        (p.opdrachtgever || "").toLowerCase().includes(q.toLowerCase())
      ).slice(0, 15)
    : [];

  return (
    <div style={{ position: "absolute", inset: 0, background: "white", zIndex: 500, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#7EC8C0", padding: "10px 16px 12px", display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.3)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "white", fontSize: 18, cursor: "pointer" }}>←</button>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
          placeholder="Zoek project, stad…"
          style={{ flex: 1, border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {results.map(p => (
          <div key={p.id} onClick={() => { onSelect(p); onClose(); }}
            style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
            <PinIcon color={typeColor(p.project_type || p.functie)} size={16} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1a2332" }}>{p.projectnaam}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{p.stad} {p.provincie && `• ${p.provincie}`}</div>
            </div>
          </div>
        ))}
        {q.length > 1 && results.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>Geen resultaten voor "{q}"</div>
        )}
        {q.length <= 1 && (
          <div style={{ padding: "24px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 12 }}>Recente projecten</div>
            {projects.slice(0, 8).map(p => (
              <div key={p.id} onClick={() => { onSelect(p); onClose(); }}
                style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
                <PinIcon color={typeColor(p.project_type || p.functie)} size={14} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2332" }}>{p.projectnaam}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState("KAART");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        // Load projects
        const projs = await sbFetch("projects", "*");
        // Enrich with thumb URLs
        const enriched = projs.map(p => ({
          ...p,
          thumbUrl: null, // Would need storage bucket
        }));
        setProjects(enriched);

        // Load contacts
        try {
          const c = await sbFetch("contacts", "*");
          setContacts(c);
        } catch {}

        // Geocode projects that need it
        setGeocoding(true);
        const needsGeocode = enriched.filter(p => !p.lat && (p.straat || p.stad));
        for (let i = 0; i < Math.min(needsGeocode.length, 20); i++) {
          const p = needsGeocode[i];
          const addr = [p.straat, p.huisnummer, p.postcode, p.stad].filter(Boolean).join(" ");
          const coords = await geocode(addr) || await geocode(`${p.stad}, Nederland`);
          if (coords) {
            setProjects(prev => prev.map(pp => pp.id === p.id ? { ...pp, ...coords } : pp));
          }
          await new Promise(r => setTimeout(r, 1200));
        }
        setGeocoding(false);
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => setLoadingDone(true), 1800);
      setTimeout(() => setLoading(false), 2400);
    }
    load();
  }, []);

  const handleSelectProject = (p) => {
    setSelectedProject(p);
    setActiveTab("KAART"); // keep tab context
  };

  return (
    <div style={{
      width: "100%", maxWidth: 430, margin: "0 auto",
      height: "100svh", display: "flex", flexDirection: "column",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: "antialiased", background: "#f4f6f9",
      position: "relative", overflow: "hidden",
    }}>
      {/* Loading screen */}
      {loading && <LoadingScreen done={loadingDone} />}

      {/* Search overlay */}
      {showSearch && <SearchOverlay projects={projects} onSelect={p => { setSelectedProject(p); setActiveTab("LIJST"); }} onClose={() => setShowSearch(false)} />}

      {/* Project detail — full screen overlay */}
      {selectedProject && !showSearch && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: "#f4f6f9" }}>
          {/* Mini header */}
          <div style={{ background: "#7EC8C0", padding: "10px 16px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LogoIcon size={34} />
              <span style={{ color: "white", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>PROJECTENOVERZICHT.NL</span>
            </div>
          </div>
          <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />
        </div>
      )}

      {/* Normal app layout */}
      <StatusBar onSearch={() => setShowSearch(true)} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {activeTab === "KAART" && <MapView projects={projects.filter(p => p.lat && p.lng)} onSelectProject={handleSelectProject} />}
        {activeTab === "LIJST" && <ListView projects={projects} onSelectProject={handleSelectProject} />}
        {activeTab === "UNIVERSE" && <UniverseView />}
        {activeTab === "PROFIELEN" && <ProfilesView contacts={contacts} />}

        {geocoding && (
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)", borderRadius: 999, padding: "8px 16px",
            fontSize: 11, fontWeight: 600, color: "#1a2332", boxShadow: "0 4px 16px rgba(0,0,0,.1)",
            zIndex: 100, pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            📍 Adressen worden geladen…
          </div>
        )}
      </div>

      <BottomBar
        onZoek={() => setShowSearch(true)}
        onFilter={() => {}}
        onFavorieten={() => {}}
        onDashboard={() => {}}
      />
    </div>
  );
}
