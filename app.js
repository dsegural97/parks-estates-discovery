"use strict";

/* =======================
   Constantes y helpers
   ======================= */
const STORAGE_KEY = "visited-parks-and-fundos-v1";
const USER_POS_KEY = "user-pos-v1";
const FILTERS_KEY = "filters-v1";
const PLACES_KEY = "custom-places-v1"; // nuevos lugares agregados por el usuario

function toKey(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Normalizador simple para búsquedas locales */
function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/* =======================
   Enlaces y navegación
   ======================= */
function wazeRouteUrlById(id, name, district) {
  const c = COORDS[id];
  if (c && Number.isFinite(c.lat) && Number.isFinite(c.lon)) {
    return `https://waze.com/ul?ll=${c.lat},${c.lon}&navigate=yes`;
  }
  const q = encodeURIComponent(`${name}, ${district}, Lima, Perú`);
  return `https://waze.com/ul?q=${q}&navigate=yes`;
}
function mapsRouteUrlById(id, name, district, userPos) {
  const c = COORDS[id];
  const dest = c ? `${c.lat},${c.lon}` : `${name}, ${district}, Lima, Perú`;
  const origin =
    userPos && Number.isFinite(userPos.lat) && Number.isFinite(userPos.lon)
      ? `&origin=${userPos.lat},${userPos.lon}`
      : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    dest
  )}&travelmode=driving${origin}`;
}

/* =======================
   Distancia y tiempo
   ======================= */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function estimateDriveRangeMin(km) {
  if (km == null || !isFinite(km)) return null;
  const baseMin = 5;
  const typical = km <= 3 ? 18 : km <= 10 ? 22 : 35; // km/h
  const fast = typical * 1.3; // tráfico fluido
  const slow = typical * 0.6; // tráfico pesado
  const fastMin = Math.max(1, Math.round(baseMin + (km / fast) * 60));
  const slowMin = Math.max(1, Math.round(baseMin + (km / slow) * 60));
  return [Math.min(fastMin, slowMin), Math.max(fastMin, slowMin)];
}
function fmtKm(km) {
  if (km == null || !isFinite(km)) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
function fmtMin(min) {
  if (min == null) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${h} h ${m} min`;
}

/* =======================
   Coordenadas (base)
   ======================= */
const COORDS = {
  [toKey("Parque de la amistad Surco")]: { lat: -12.1495, lon: -76.998 },
  [toKey("Parque Voces por el Clima Surco")]: { lat: -12.1668, lon: -76.9756 },
  [toKey("Parque Miguel Grau Miraflores")]: { lat: -12.1228, lon: -77.0312 },
  [toKey("Parque El Principito Miraflores")]: { lat: -12.1298, lon: -77.0225 },
  [toKey("Parque Salazar Miraflores")]: { lat: -12.1296, lon: -77.03 },
  [toKey("Parque Antonio Raimondi Miraflores")]: {
    lat: -12.1371,
    lon: -77.0369,
  },
  [toKey("Parque Domossola Miraflores")]: { lat: -12.13, lon: -77.0377 },
  [toKey("Parque Casuarinas Surco")]: { lat: -12.1185, lon: -76.9855 },
  [toKey("Parque de la Felicidad San Borja")]: { lat: -12.1006, lon: -77.0028 },
  [toKey("Parque de la Imaginación San Miguel")]: {
    lat: -12.0775,
    lon: -77.0868,
  },
  [toKey("Parque Bicentenario San Isidro")]: { lat: -12.0999, lon: -77.0368 },
  [toKey("Circuito Mágico del Agua Cercado de Lima")]: {
    lat: -12.0705,
    lon: -77.0334,
  },
  [toKey("Parque Reducto 2 Miraflores")]: { lat: -12.1218, lon: -77.022 },
  [toKey("Loma Amarilla Surco")]: { lat: -12.1529, lon: -76.9832 },
  [toKey("Parque del Aire Surco")]: { lat: -12.1053, lon: -77.0005 },
  [toKey("Parque El Olivar San Isidro")]: { lat: -12.1023, lon: -77.0365 },
  [toKey("Parque San Martín San Borja")]: { lat: -12.1067, lon: -77.0009 },
  [toKey("Planetario José Castro Mendivil Chorrillos")]: {
    lat: -12.1795,
    lon: -77.0226,
  },
  [toKey("Parque de los Niños La Molina")]: { lat: -12.0929, lon: -76.9478 },
  [toKey("Parque de las Leyendas San Miguel")]: { lat: -12.0879, lon: -77.068 },
  /* Fundos */
  [toKey("Fundo San Vicente Lurín")]: { lat: -12.2653, lon: -76.877 },
  [toKey("Fundo Rumipama Cieneguilla")]: { lat: -12.1125, lon: -76.8355 },
  [toKey("Fundo Mamacona Lurín")]: { lat: -12.264, lon: -76.8906 },
  [toKey("Fundo La Perla Huaral")]: { lat: -11.4956, lon: -77.2075 },
  [toKey("Fundo Viera Chosica")]: { lat: -11.9435, lon: -76.6966 },
  [toKey("Fundo La Fogata Cieneguilla")]: { lat: -12.1005, lon: -76.836 },
};

/* =======================
   Íconos SVG (44px via .app-icon)
   ======================= */
const WAZE_APP_ICON = `
<svg class="app-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M566.6 265.7C581.1 351.6 535.7 433.6 453.4 473.8C466.4 507.9 441 544 405.1 544C391.9 544 379.1 538.9 369.5 529.8C359.9 520.7 354.2 508.2 353.5 495C347.1 495.2 289.3 495 277.2 494.4C276.9 501.2 275.3 507.9 272.5 514C269.7 520.1 265.6 525.7 260.6 530.3C255.6 534.9 249.8 538.5 243.4 540.8C237 543.1 230.2 544.2 223.5 543.9C189.6 542.5 165.5 509.1 176.5 476C139.3 462.9 104 441.1 76.9 405.2C63.9 387.9 76.4 363.4 97.7 363.4C144 363.4 129.9 309.2 140.9 253.1C159.3 159.2 257.7 96 352.6 96C455.1 96 549.8 166.7 566.7 265.7zM437.9 452.3C479.9 433.1 519.2 395.6 534.2 350.2C574.7 227.1 470 122.2 352.5 122.2C269.1 122.2 182.2 177.6 166.4 258.2C156.9 307.1 171.4 389.6 97.7 389.6C122.6 422.7 156 442.2 191.4 453.6C216.1 431.8 255.3 438.1 271.2 467.9C285.4 468.9 350.4 469.1 359.1 468.7C362.6 461.8 367.6 455.8 373.8 451.2C380 446.6 387 443.3 394.6 441.7C402.2 440.1 410 440.3 417.5 442.1C425 443.9 432 447.4 438 452.3zM269.5 251.1C269.5 216.4 320.3 216.4 320.3 251.1C320.3 285.8 269.5 285.8 269.5 251.1zM386.1 251.1C386.1 216.4 437 216.4 437 251.1C437 285.8 386.1 285.9 386.1 251.1zM263.5 321.8C260.1 304.9 285.7 299.6 289.1 316.6L289.2 316.9C293.3 338.3 319 360.9 353.3 360C389 359.1 412.6 337.8 417.4 317.2C421.9 301.1 446 306.8 442.9 323.2C437.7 345.4 411.7 385.2 351.4 386.1C308.8 386.1 270.5 358.3 263.5 321.9L263.5 321.9z"/>
</svg>
`;
const GMAPS_APP_ICON = `
<svg class="app-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M128 252.6C128 148.4 214 64 320 64C426 64 512 148.4 512 252.6C512 371.9 391.8 514.9 341.6 569.4C329.8 582.2 310.1 582.2 298.3 569.4C248.1 514.9 127.9 371.9 127.9 252.6zM320 320C355.3 320 384 291.3 384 256C384 220.7 355.3 192 320 192C284.7 192 256 220.7 256 256C256 291.3 284.7 320 320 320z"/>
</svg>
`;

/* =======================
   Datos base de lugares
   ======================= */
const DATA_BASE = [
  // Parques
  {
    id: toKey("Parque de la amistad Surco"),
    name: "Parque de la Amistad",
    district: "Surco",
    type: "Parque",
  },
  {
    id: toKey("Parque Voces por el Clima Surco"),
    name: "Parque Voces por el Clima",
    district: "Surco",
    type: "Parque",
  },
  {
    id: toKey("Parque Miguel Grau Miraflores"),
    name: "Parque Miguel Grau",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Parque El Principito Miraflores"),
    name: "Parque El Principito",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Parque Salazar Miraflores"),
    name: "Parque Salazar",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Parque Antonio Raimondi Miraflores"),
    name: "Parque Antonio Raimondi",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Parque Domossola Miraflores"),
    name: "Parque Domossola",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Parque Casuarinas Surco"),
    name: "Parque Casuarinas",
    district: "Surco",
    type: "Parque",
  },
  {
    id: toKey("Parque de la Felicidad San Borja"),
    name: "Parque de la Felicidad",
    district: "San Borja",
    type: "Parque",
  },
  {
    id: toKey("Parque de la Imaginación San Miguel"),
    name: "Parque de la Imaginación",
    district: "San Miguel",
    type: "Parque",
  },
  {
    id: toKey("Parque Bicentenario San Isidro"),
    name: "Parque Bicentenario",
    district: "San Isidro",
    type: "Parque",
  },
  {
    id: toKey("Circuito Mágico del Agua Cercado de Lima"),
    name: "Circuito Mágico del Agua",
    district: "Cercado de Lima",
    type: "Parque",
  },
  {
    id: toKey("Parque Reducto 2 Miraflores"),
    name: "Parque Reducto N°2",
    district: "Miraflores",
    type: "Parque",
  },
  {
    id: toKey("Loma Amarilla Surco"),
    name: "Loma Amarilla",
    district: "Surco",
    type: "Parque",
  },
  {
    id: toKey("Parque del Aire Surco"),
    name: "Parque del Aire",
    district: "Surco",
    type: "Parque",
  },
  {
    id: toKey("Parque El Olivar San Isidro"),
    name: "Parque El Olivar",
    district: "San Isidro",
    type: "Parque",
  },
  {
    id: toKey("Parque San Martín San Borja"),
    name: "Parque San Martín",
    district: "San Borja",
    type: "Parque",
  },
  {
    id: toKey("Planetario José Castro Mendivil Chorrillos"),
    name: "Planetario José Castro Mendivil",
    district: "Chorrillos",
    type: "Parque",
  },
  {
    id: toKey("Parque de los Niños La Molina"),
    name: "Parque de los Niños",
    district: "La Molina",
    type: "Parque",
  },
  {
    id: toKey("Parque de las Leyendas San Miguel"),
    name: "Parque de las Leyendas",
    district: "San Miguel",
    type: "Parque",
  },
  // Fundos
  {
    id: toKey("Fundo San Vicente Lurín"),
    name: "San Vicente",
    district: "Lurín",
    type: "Fundo",
  },
  {
    id: toKey("Fundo Rumipama Cieneguilla"),
    name: "Rumipama",
    district: "Cieneguilla",
    type: "Fundo",
  },
  {
    id: toKey("Fundo Mamacona Lurín"),
    name: "Mamacona",
    district: "Lurín",
    type: "Fundo",
  },
  {
    id: toKey("Fundo La Perla Huaral"),
    name: "La Perla",
    district: "Huaral",
    type: "Fundo",
  },
  {
    id: toKey("Fundo Viera Chosica"),
    name: "Viera",
    district: "Chosica",
    type: "Fundo",
  },
  {
    id: toKey("Fundo La Fogata Cieneguilla"),
    name: "La Fogata",
    district: "Cieneguilla",
    type: "Fundo",
  },
];

/* =======================
   DOM principal
   ======================= */
const $q = document.getElementById("q");
const $sort = document.getElementById("sort");
const $only = document.getElementById("onlyPending");
const $list = document.getElementById("list");
const $year = document.getElementById("year");
const $fill = document.getElementById("progressFill");
const $ptext = document.getElementById("progressText");
const $useLoc = document.getElementById("useLocation");
const $typeChips = document.getElementById("typeChips");
const $districtChips = document.getElementById("districtChips");
const $clearFilters = document.getElementById("clearFilters");

$year.textContent = new Date().getFullYear();

/* =======================
   Estado persistente (localStorage)
   ======================= */
let visited = {};
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) visited = JSON.parse(raw) || {};
} catch {}

let userPos = null;
try {
  const saved = JSON.parse(localStorage.getItem(USER_POS_KEY) || "null");
  if (saved && typeof saved.lat === "number" && typeof saved.lon === "number")
    userPos = saved;
} catch {}

let selectedTypes = new Set();
let selectedDistricts = new Set();
try {
  const f = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
  if (f && Array.isArray(f.types) && Array.isArray(f.districts)) {
    selectedTypes = new Set(f.types);
    selectedDistricts = new Set(f.districts);
  }
} catch {}

/* Lugares agregados por el usuario (persistidos) */
let CUSTOM_PLACES = [];
try {
  const raw = localStorage.getItem(PLACES_KEY);
  if (raw) CUSTOM_PLACES = JSON.parse(raw) || [];
} catch {}

/* Devuelve toda la data (base + agregados) */
function ALL_DATA() {
  return DATA_BASE.concat(CUSTOM_PLACES);
}

function persistFilters() {
  try {
    localStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        types: Array.from(selectedTypes),
        districts: Array.from(selectedDistricts),
      })
    );
  } catch {}
}
function persistCustomPlaces() {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(CUSTOM_PLACES));
  } catch {}
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  } catch {}
}
function saveUserPos() {
  try {
    localStorage.setItem(USER_POS_KEY, JSON.stringify(userPos));
  } catch {}
}

/* =======================
   Parser automático de coordenadas desde link de Google Maps
   (acepta varios formatos: @lat,lon, 'q=lat,lon', 'destination=lat,lon', etc.)
   ======================= */
function parseLatLonFromGMaps(url) {
  if (!url) return null;
  try {
    const u = decodeURIComponent(String(url).trim());

    // 1) @lat,lon,zoom
    {
      const m = u.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }

    // 2) query=lat,lon OR q=lat,lon OR destination=lat,lon (Google Directions)
    {
      const m = u.match(
        /(?:[?&](?:q|query|destination)=)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
      );
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }

    // 3) Place/dir URLs que terminan en /@lat,lon
    {
      const m = u.match(/\/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }

    // 4) Coordenadas “sueltas” en el string (primera pareja lat,lon razonable)
    {
      const m = u.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) {
        const lat = parseFloat(m[1]),
          lon = parseFloat(m[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
      }
    }
  } catch {}
  return null;
}

/* =======================
   Conteos y distritos dinámicos
   ======================= */
const TYPES = ["Parque", "Fundo"];

function computeCounts() {
  const data = ALL_DATA();
  const q = norm($q.value || "");
  const onlyPending = $only.checked;

  // Tipos: respeta q, onlyPending y distritos activos
  const baseForType = data.filter((p) => {
    const hay = norm(`${p.name} ${p.district} ${p.type}`);
    const passQ = !q || hay.includes(q);
    const passOnly = !onlyPending || !visited[p.id];
    const passDistrict = selectedDistricts.size
      ? selectedDistricts.has(p.district)
      : true;
    return passQ && passOnly && passDistrict;
  });
  const typeCounts = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
  baseForType.forEach((p) => {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  });

  // Distritos: respeta q, onlyPending y tipos activos
  const baseForDistrict = data.filter((p) => {
    const hay = norm(`${p.name} ${p.district} ${p.type}`);
    const passQ = !q || hay.includes(q);
    const passOnly = !onlyPending || !visited[p.id];
    const passType = selectedTypes.size ? selectedTypes.has(p.type) : true;
    return passQ && passOnly && passType;
  });

  const districtCounts = {};
  baseForDistrict.forEach((p) => {
    districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
  });

  const availableDistricts = Object.entries(districtCounts)
    .filter(([, c]) => c > 0)
    .map(([d]) => d)
    .sort((a, b) => a.localeCompare(b, "es"));

  return { typeCounts, districtCounts, availableDistricts };
}

/* =======================
   Render de chips (con "Todos" en distritos y fila condicional)
   ======================= */
function renderChips() {
  const { typeCounts, districtCounts, availableDistricts } = computeCounts();

  // TIPOS
  $typeChips.innerHTML = TYPES.map(
    (t) => `
    <button class="chip-btn ${
      selectedTypes.has(t) ? "active" : ""
    }" data-type="${t}" type="button">
      ${t} <span class="chip-count">(${typeCounts[t] || 0})</span>
    </button>
  `
  ).join("");

  // DISTRITOS (solo si hay algún tipo activo)
  const districtRow =
    $districtChips.closest(".filters-row") || $districtChips.parentElement;
  if (selectedTypes.size === 0) {
    if (districtRow) districtRow.style.display = "none";
    $districtChips.innerHTML = "";
    return;
  } else {
    if (districtRow) districtRow.style.display = "flex";
  }

  // Limpia distritos que ya no aplican
  let changed = false;
  for (const d of Array.from(selectedDistricts)) {
    if (!availableDistricts.includes(d)) {
      selectedDistricts.delete(d);
      changed = true;
    }
  }
  if (changed) persistFilters();

  // ¿"Todos" activo?
  const allSelected =
    availableDistricts.length > 0 &&
    availableDistricts.every((d) => selectedDistricts.has(d)) &&
    selectedDistricts.size === availableDistricts.length;

  const totalAvail = availableDistricts.reduce(
    (sum, d) => sum + (districtCounts[d] || 0),
    0
  );

  $districtChips.innerHTML = [
    `
    <button class="chip-btn ${
      allSelected ? "active" : ""
    }" data-all="1" type="button" title="Seleccionar/Quitar todos">
      Todos <span class="chip-count">(${totalAvail})</span>
    </button>
    `,
    ...availableDistricts.map(
      (d) => `
      <button class="chip-btn ${
        selectedDistricts.has(d) ? "active" : ""
      }" data-district="${d}" type="button">
        ${d} <span class="chip-count">(${districtCounts[d] || 0})</span>
      </button>
    `
    ),
  ].join("");
}

/* =======================
   Cálculo y render de tarjetas
   ======================= */
function compute() {
  const data = ALL_DATA();
  const q = norm($q.value || "");
  const only = $only.checked;

  let items = data
    .map((p) => {
      const c = COORDS[p.id];
      let dist = null;
      if (userPos && c)
        dist = haversineKm(userPos.lat, userPos.lon, c.lat, c.lon);
      return { ...p, _distanceKm: dist };
    })
    .filter((p) => {
      const hay = norm(`${p.name} ${p.district} ${p.type}`);
      const passQ = !q || hay.includes(q);
      const passOnly = !only || !visited[p.id];
      const passType = selectedTypes.size ? selectedTypes.has(p.type) : true;
      const passDistrict = selectedDistricts.size
        ? selectedDistricts.has(p.district)
        : true;
      return passQ && passOnly && passType && passDistrict;
    });

  const sort = $sort.value;
  items.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "es");
    if (sort === "district")
      return (
        a.district.localeCompare(b.district, "es") ||
        a.name.localeCompare(b.name, "es")
      );
    if (sort === "distance") {
      const ad = a._distanceKm ?? Infinity;
      const bd = b._distanceKm ?? Infinity;
      if (ad !== bd) return ad - bd;
      return a.name.localeCompare(b.name, "es");
    }
    return (
      a.type.localeCompare(b.type, "es") || a.name.localeCompare(b.name, "es")
    );
  });

  return items;
}

function render() {
  const items = compute();

  // Progreso
  const total = ALL_DATA().length;
  const done = Object.values(visited).filter(Boolean).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);
  $fill.style.width = percent + "%";
  $ptext.textContent = `${done}/${total} (${percent}%)`;

  // Tarjetas
  $list.innerHTML = items
    .map((p) => {
      const isVisited = !!visited[p.id];
      const distTxt = fmtKm(p._distanceKm);
      const range =
        p._distanceKm != null ? estimateDriveRangeMin(p._distanceKm) : null;
      const timeTxt = range ? `${fmtMin(range[0])}–${fmtMin(range[1])}` : null;
      const chip =
        distTxt || timeTxt
          ? `<span class="chip" title="Distancia en línea recta • Tiempo estimado (rango) según tráfico urbano">≈ ${
              distTxt || "—"
            }${timeTxt ? " • ~" + timeTxt : ""}</span>`
          : "";

      const wazeHref = wazeRouteUrlById(p.id, p.name, p.district);
      const mapsHref = mapsRouteUrlById(p.id, p.name, p.district, userPos);

      return `
      <div class="card">
        <div>
          <div class="small" style="display:flex;gap:8px;align-items:center">
            <span class="badge ${p.type === "Parque" ? "park" : "fundo"}">${
        p.type
      }</span>
            ${
              isVisited ? `<span style="color:var(--ok)">✓ Visitado</span>` : ""
            }
          </div>
          <div style="font-size:18px;font-weight:700;margin-top:6px">${
            p.name
          }</div>
          <div class="small">${p.district}, Lima ${chip}</div>
        </div>

        <div class="actions actions-centered">
          <a class="link icon-only" href="${wazeHref}" target="_blank" rel="noopener noreferrer"
             title="Ruta desde aquí (Waze)" aria-label="Ruta desde aquí (Waze)">${WAZE_APP_ICON}</a>

          <a class="link icon-only" href="${mapsHref}" target="_blank" rel="noopener noreferrer"
             title="Ruta desde aquí (Google Maps)" aria-label="Ruta desde aquí (Google Maps)">${GMAPS_APP_ICON}</a>

          <label class="small check-centered">
            <input data-id="${p.id}" class="visit-toggle" type="checkbox" ${
        isVisited ? "checked" : ""
      }/> He ido ✅
          </label>
        </div>
      </div>
    `;
    })
    .join("");

  // Toggle "He ido"
  document.querySelectorAll(".visit-toggle").forEach((el) => {
    el.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-id");
      visited[id] = !!e.target.checked;
      save();
      render();
    });
  });

  // Chips
  renderChips();
}

/* =======================
   UI: Chips, búsqueda, ubicación
   ======================= */
$typeChips.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-type]");
  if (!btn) return;
  const t = btn.getAttribute("data-type");
  if (selectedTypes.has(t)) selectedTypes.delete(t);
  else selectedTypes.add(t);
  persistFilters();
  render();
});

$districtChips.addEventListener("click", (e) => {
  const allBtn = e.target.closest('[data-all="1"]');
  if (allBtn) {
    const { availableDistricts } = computeCounts();
    const allSelected =
      availableDistricts.length > 0 &&
      availableDistricts.every((d) => selectedDistricts.has(d)) &&
      selectedDistricts.size === availableDistricts.length;

    if (allSelected) selectedDistricts.clear();
    else selectedDistricts = new Set(availableDistricts);

    persistFilters();
    render();
    return;
  }

  const btn = e.target.closest("[data-district]");
  if (!btn) return;
  const d = btn.getAttribute("data-district");
  if (selectedDistricts.has(d)) selectedDistricts.delete(d);
  else selectedDistricts.add(d);
  persistFilters();
  render();
});

$clearFilters.addEventListener("click", () => {
  selectedTypes.clear();
  selectedDistricts.clear();
  persistFilters();
  render();
});

$useLoc.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      userPos = { lat, lon };
      saveUserPos();
      if ($sort.value !== "distance") {
        $sort.value = "distance";
      }
      render();
    },
    (err) => {
      alert("No fue posible obtener tu ubicación: " + err.message);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});

$q.addEventListener("input", render);
$sort.addEventListener("change", render);
$only.addEventListener("change", render);

/* =======================
   NUEVO: Botón "+ Agregar lugar" (inyectado)
   - Abre un modal con formulario
   - Guarda en localStorage
   - Opción de pegar link de Google Maps para detectar lat/lon automáticamente
   ======================= */
(function injectAddPlaceUI() {
  // 1) Estilos mínimos del modal (inyectados para no tocar tu CSS)
  const css = `
  .addplace-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9999}
  .addplace-modal{background:#fff;color:#111;max-width:520px;width:92%;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(0,0,0,.15)}
  .addplace-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb}
  .addplace-body{padding:16px;display:grid;gap:12px}
  .addplace-row{display:grid;gap:6px}
  .addplace-row label{font-size:12px;color:#374151}
  .addplace-row input,.addplace-row select, .addplace-row textarea{padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:14px}
  .addplace-foot{display:flex;gap:10px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb}
  .addplace-btn{border:1px solid #d1d5db;border-radius:10px;background:#f9fafb;padding:10px 14px;cursor:pointer}
  .addplace-btn.primary{background:#0284c7;color:#fff;border-color:#0284c7}
  .addplace-close{background:transparent;border:none;font-size:18px;cursor:pointer}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // 2) Botón en la toolbar
  const toolbar = document.querySelector(".toolbar") || document.body;
  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "+ Agregar lugar";
  addBtn.title = "Agregar Parque o Fundo";
  toolbar.appendChild(addBtn);

  // 3) Modal HTML
  const backdrop = document.createElement("div");
  backdrop.className = "addplace-backdrop";
  backdrop.innerHTML = `
    <div class="addplace-modal" role="dialog" aria-modal="true" aria-labelledby="ap-title">
      <div class="addplace-head">
        <strong id="ap-title">Agregar lugar</strong>
        <button class="addplace-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="addplace-body">
        <div class="addplace-row">
          <label>Tipo</label>
          <select id="ap-type">
            <option value="Parque">Parque</option>
            <option value="Fundo">Fundo</option>
          </select>
        </div>
        <div class="addplace-row">
          <label>Nombre</label>
          <input id="ap-name" placeholder="Ej. Parque Central" />
        </div>
        <div class="addplace-row">
          <label>Distrito</label>
          <input id="ap-district" placeholder="Ej. Miraflores" />
        </div>
        <div class="addplace-row">
          <label>Link de Google Maps (opcional — detecta coordenadas)</label>
          <input id="ap-link" placeholder="Pega aquí el enlace que compartes desde Maps" />
        </div>
        <div class="addplace-row">
          <label>Coordenadas (opcional si pegaste el link):</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="ap-lat" placeholder="lat (ej. -12.12)" />
            <input id="ap-lon" placeholder="lon (ej. -77.03)" />
          </div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:4px 0 0">
          Si no pones coordenadas, igual podrás abrir la ruta (Waze/Maps buscarán por nombre y distrito).
          Para ver <em>distancia</em> y <em>tiempo</em> aquí, pega el link de Maps o pon lat/lon.
        </p>
      </div>
      <div class="addplace-foot">
        <button class="addplace-btn" id="ap-cancel">Cancelar</button>
        <button class="addplace-btn primary" id="ap-save">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const $type = () => document.getElementById("ap-type");
  const $name = () => document.getElementById("ap-name");
  const $district = () => document.getElementById("ap-district");
  const $link = () => document.getElementById("ap-link");
  const $lat = () => document.getElementById("ap-lat");
  const $lon = () => document.getElementById("ap-lon");

  function openModal() {
    $type().value = "Parque";
    $name().value = "";
    $district().value = "";
    $link().value = "";
    $lat().value = "";
    $lon().value = "";
    backdrop.style.display = "flex";
    setTimeout(() => $name().focus(), 0);
  }
  function closeModal() {
    backdrop.style.display = "none";
  }

  addBtn.addEventListener("click", openModal);
  backdrop
    .querySelector(".addplace-close")
    .addEventListener("click", closeModal);
  backdrop.querySelector("#ap-cancel").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.style.display === "flex") closeModal();
  });

  // Autodetectar coords al pegar link
  $link().addEventListener("change", () => {
    const coords = parseLatLonFromGMaps($link().value);
    if (coords) {
      $lat().value = coords.lat;
      $lon().value = coords.lon;
    }
  });

  // Guardar
  backdrop.querySelector("#ap-save").addEventListener("click", () => {
    const type = ($type().value || "").trim();
    const name = ($name().value || "").trim();
    const district = ($district().value || "").trim();

    if (!type || !name || !district) {
      alert("Completa Tipo, Nombre y Distrito.");
      return;
    }
    if (!["Parque", "Fundo"].includes(type)) {
      alert("Tipo inválido.");
      return;
    }

    // id estable
    const id = toKey(
      `${type === "Parque" ? "Parque" : "Fundo"} ${name} ${district}`
    );

    // Detecta coords: preferir link -> inputs
    let lat = parseFloat($lat().value);
    let lon = parseFloat($lon().value);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      const coords = parseLatLonFromGMaps($link().value);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

    // Si hay coords válidas, guarda en COORDS (sobre-escribe si ya existe)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      COORDS[id] = { lat, lon };
    }

    // ¿Existe ya el lugar? Si existe, actualizamos nombre/distrito/tipo (merge)
    const existingIdx = CUSTOM_PLACES.findIndex((p) => p.id === id);
    const payload = { id, name, district, type };

    if (existingIdx >= 0) {
      CUSTOM_PLACES[existingIdx] = payload;
    } else {
      CUSTOM_PLACES.push(payload);
    }

    // Persistir y refrescar
    persistCustomPlaces();
    closeModal();
    render();
  });
})();

/* =======================
   Inicio
   ======================= */
render();

/* =======================
   Tests ligeros (consola)
   ======================= */
(function runTests() {
  // Haversine 0
  console.assert(Math.abs(haversineKm(0, 0, 0, 0)) < 1e-9, "haversine 0 OK");

  // Parser de Maps: varios formatos válidos
  const t1 = parseLatLonFromGMaps(
    "https://www.google.com/maps/place/@-12.12,-77.03,15z"
  );
  const t2 = parseLatLonFromGMaps(
    "https://www.google.com/maps/dir/?api=1&destination=-12.1,-77.05"
  );
  const t3 = parseLatLonFromGMaps("https://maps.google.com/?q=-12.08,-77.02");
  console.assert(t1 && t1.lat && t1.lon, "parser @lat,lon OK");
  console.assert(t2 && t2.lat && t2.lon, "parser destination=lat,lon OK");
  console.assert(t3 && t3.lat && t3.lon, "parser q=lat,lon OK");
})();
