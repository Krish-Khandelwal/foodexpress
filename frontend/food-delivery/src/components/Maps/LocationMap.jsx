import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createBadgeIcon = (emoji, bgColor) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background:${bgColor};width:36px;height:36px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

const shopIcon = createBadgeIcon('🏪', '#ea580c');
const customerIcon = createBadgeIcon('🏠', '#16a34a');
const riderIcon = createBadgeIcon('🛵', '#2563eb');
const pinIcon = createBadgeIcon('📍', '#e11d48');

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
};

const MapClickHandler = ({ onSelectLocation }) => {
  useMapEvents({
    click(e) {
      if (onSelectLocation) {
        onSelectLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

const LocationMap = ({
  lat,
  lng,
  popupText = 'Selected Location',
  selectable = false,
  onSelectLocation,
  shopLocation,
  additionalShops = [],
  customerLocation,
  riderLocation,
  shopName = 'Restaurant (Pickup)',
  customerName = 'Customer (Delivery)',
  riderName = 'Delivery Rider (Live)',
}) => {
  const [roadPositions, setRoadPositions] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  const defaultLat =
    riderLocation?.lat ||
    customerLocation?.lat ||
    shopLocation?.lat ||
    lat ||
    28.6139;
  const defaultLng =
    riderLocation?.lng ||
    customerLocation?.lng ||
    shopLocation?.lng ||
    lng ||
    77.209;

  const centerPosition = [defaultLat, defaultLng];

  // Collect all waypoints in order: Shop(s) -> Rider (if active) -> Customer
  const waypoints = [];
  if (Array.isArray(additionalShops) && additionalShops.length > 0) {
    additionalShops.forEach((s) => {
      if (s?.location?.lat && s?.location?.lng) {
        waypoints.push({ lat: s.location.lat, lng: s.location.lng, name: s.name });
      }
    });
  } else if (shopLocation?.lat && shopLocation?.lng) {
    waypoints.push({ lat: shopLocation.lat, lng: shopLocation.lng, name: shopName });
  }

  if (riderLocation?.lat && riderLocation?.lng) {
    waypoints.push({ lat: riderLocation.lat, lng: riderLocation.lng, name: riderName });
  }

  if (customerLocation?.lat && customerLocation?.lng) {
    waypoints.push({ lat: customerLocation.lat, lng: customerLocation.lng, name: customerName });
  }

  const waypointsKey = waypoints.map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join(';');

  // Fetch actual road route from OSRM public driving router
  useEffect(() => {
    if (waypoints.length < 2) {
      setRoadPositions([]);
      setRouteInfo(null);
      return;
    }

    let isCancelled = false;
    const fetchRoadRoute = async () => {
      try {
        const coordsString = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isCancelled && data?.routes?.[0]?.geometry?.coordinates) {
          const latLngs = data.routes[0].geometry.coordinates.map(([lon, latCoord]) => [
            latCoord,
            lon,
          ]);
          setRoadPositions(latLngs);
          setRouteInfo({
            distanceKm: (data.routes[0].distance / 1000).toFixed(1),
            durationMin: Math.max(1, Math.round(data.routes[0].duration / 60)),
          });
        } else if (!isCancelled) {
          setRoadPositions(waypoints.map((w) => [w.lat, w.lng]));
        }
      } catch {
        if (!isCancelled) {
          setRoadPositions(waypoints.map((w) => [w.lat, w.lng]));
        }
      }
    };

    fetchRoadRoute();
    return () => {
      isCancelled = true;
    };
  }, [waypointsKey]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
      {routeInfo && (
        <div className="absolute top-3 right-3 z-400 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-md border text-xs font-bold text-gray-800 flex items-center gap-2">
          <span className="text-orange-600">🛣️ {routeInfo.distanceKm} km</span>
          <span>•</span>
          <span className="text-blue-600">~{routeInfo.durationMin} mins via road</span>
        </div>
      )}

      <MapContainer
        center={centerPosition}
        zoom={14}
        style={{ height: '100%', width: '100%', minHeight: '260px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={defaultLat} lng={defaultLng} />

        {selectable && <MapClickHandler onSelectLocation={onSelectLocation} />}

        {/* Render multiple shops if multi-restaurant order, otherwise primary shop */}
        {Array.isArray(additionalShops) && additionalShops.length > 0 ? (
          additionalShops.map(
            (s, idx) =>
              s?.location?.lat &&
              s?.location?.lng && (
                <Marker
                  key={s._id || idx}
                  position={[s.location.lat, s.location.lng]}
                  icon={shopIcon}
                >
                  <Popup>
                    <strong>🏪 {s.name || 'Restaurant'}</strong>
                  </Popup>
                </Marker>
              )
          )
        ) : (
          shopLocation?.lat &&
          shopLocation?.lng && (
            <Marker position={[shopLocation.lat, shopLocation.lng]} icon={shopIcon}>
              <Popup>
                <strong>🏪 {shopName}</strong>
              </Popup>
            </Marker>
          )
        )}

        {customerLocation?.lat && customerLocation?.lng && (
          <Marker
            position={[customerLocation.lat, customerLocation.lng]}
            icon={customerIcon}
          >
            <Popup>
              <strong>🏠 {customerName}</strong>
            </Popup>
          </Marker>
        )}

        {riderLocation?.lat && riderLocation?.lng && (
          <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
            <Popup>
              <strong>🛵 {riderName}</strong>
            </Popup>
          </Marker>
        )}

        {/* Road Path Polyline */}
        {roadPositions.length >= 2 && (
          <Polyline
            positions={roadPositions}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }}
          />
        )}

        {/* Single marker mode for Address Selection */}
        {!shopLocation && !customerLocation && !riderLocation && (
          <Marker position={centerPosition} icon={pinIcon}>
            <Popup>{popupText}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;