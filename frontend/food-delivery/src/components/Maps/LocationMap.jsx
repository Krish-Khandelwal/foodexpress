import React, { useEffect } from 'react';
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

// Custom emoji badge icons so markers never break and clearly distinguish roles
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

/**
 * Supports both:
 * 1. Single interactive location picker: <LocationMap lat={..} lng={..} selectable onSelectLocation={fn} />
 * 2. Multi-marker live route tracker: <LocationMap shopLocation={..} customerLocation={..} riderLocation={..} />
 */
const LocationMap = ({
  lat,
  lng,
  popupText = 'Selected Location',
  selectable = false,
  onSelectLocation,
  shopLocation,
  customerLocation,
  riderLocation,
  shopName = 'Restaurant (Pickup)',
  customerName = 'Customer (Delivery)',
  riderName = 'Delivery Rider (Live)',
}) => {
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

  // Build route line points if multiple locations are provided
  const routePoints = [];
  if (shopLocation?.lat && shopLocation?.lng) {
    routePoints.push([shopLocation.lat, shopLocation.lng]);
  }
  if (riderLocation?.lat && riderLocation?.lng) {
    routePoints.push([riderLocation.lat, riderLocation.lng]);
  }
  if (customerLocation?.lat && customerLocation?.lng) {
    routePoints.push([customerLocation.lat, customerLocation.lng]);
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
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

        {/* Multi-marker mode for Order Tracking & Rider Route */}
        {shopLocation?.lat && shopLocation?.lng && (
          <Marker position={[shopLocation.lat, shopLocation.lng]} icon={shopIcon}>
            <Popup>
              <strong>🏪 {shopName}</strong>
            </Popup>
          </Marker>
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

        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#ea580c', weight: 4, dashArray: '8, 8' }}
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