import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Vite (icons aren't bundled by default)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPE_COLORS = {
  city: "#5d4cff",
  travel: "#ff7a59",
  family: "#2ec4b6",
  daily: "#ffb84d",
  default: "#7c8aa6",
};

function coloredDivIcon(color, label) {
  return L.divIcon({
    className: "spacemap-marker",
    html: `<span class="spacemap-pin" style="background:${color}">${label || ""}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [points, map]);
  return null;
}

export default function SpaceMap({
  places = [],
  events = [],
  onSelectPlace,
  selectedPlaceId,
  height = 420,
}) {
  const [tileError, setTileError] = useState(false);

  const geoPlaces = useMemo(
    () =>
      places
        .map((p) => {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
          return { ...p, lat, lng };
        })
        .filter(Boolean),
    [places]
  );

  // Build a chronological trajectory across all geocoded events
  const trajectory = useMemo(() => {
    const sorted = [...events]
      .filter((e) => e.placeId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const seen = new Set();
    const path = [];
    sorted.forEach((ev) => {
      const p = geoPlaces.find((gp) => gp.id === ev.placeId);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        path.push({ lat: p.lat, lng: p.lng, eventId: ev.id, eventTitle: ev.title, place: p });
      }
    });
    return path;
  }, [events, geoPlaces]);

  const center = geoPlaces[0]
    ? [geoPlaces[0].lat, geoPlaces[0].lng]
    : [35.8617, 104.1954]; // fallback: center of China

  if (geoPlaces.length === 0) {
    return (
      <div className="spacemap-fallback" style={{ height }}>
        <div className="spacemap-fallback-inner">
          <strong>暂无坐标</strong>
          <p>所有地点都还没有经纬度，地图暂不可用。</p>
        </div>
      </div>
    );
  }

  if (tileError) {
    return (
      <div className="spacemap-fallback" style={{ height }}>
        <div className="spacemap-fallback-inner">
          <strong>地图加载失败</strong>
          <p>无法访问底图瓦片（可能离线），下面按时间倒序列出地点：</p>
          <ul className="spacemap-fallback-list">
            {geoPlaces.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`spacemap-fallback-item ${p.id === selectedPlaceId ? "is-active" : ""}`}
                  onClick={() => onSelectPlace && onSelectPlace(p)}
                >
                  <span className="spacemap-fallback-name">{p.name}</span>
                  <span className="spacemap-fallback-coord">
                    {p.lat.toFixed(2)}, {p.lng.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="spacemap" style={{ height }}>
      <MapContainer
        center={center}
        zoom={4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: 16 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />

        <FitBounds points={geoPlaces} />

        {geoPlaces.map((p) => {
          const color = TYPE_COLORS[p.type] || TYPE_COLORS.default;
          const isActive = p.id === selectedPlaceId;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={coloredDivIcon(isActive ? "#ff5470" : color, "•")}
              eventHandlers={{
                click: () => onSelectPlace && onSelectPlace(p),
              }}
            >
              <Popup>
                <div className="spacemap-popup">
                  <strong>{p.name}</strong>
                  {p.summary && <p>{p.summary}</p>}
                  <small>
                    {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                  </small>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {trajectory.length >= 2 && (
          <Polyline
            positions={trajectory.map((t) => [t.lat, t.lng])}
            pathOptions={{ color: "#5d4cff", weight: 3, opacity: 0.7, dashArray: "6 6" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
