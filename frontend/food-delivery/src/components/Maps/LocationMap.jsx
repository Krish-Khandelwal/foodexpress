import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to create custom round emoji markers
const createBadgeIcon = (emoji, bgColor) => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background:${bgColor};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28);">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const shopIcon = createBadgeIcon('🍽️', '#ea580c');
const riderIcon = createBadgeIcon('🛵', '#2563eb');
const customerIcon = createBadgeIcon('🏠', '#16a34a');

// Fit map bounds ONLY when the route stage changes
const FitBoundsOncePerStage = ({ points, stageKey }) => {
  const map = useMap();
  const lastStageRef = useRef('');

  useEffect(() => {
    if (lastStageRef.current === stageKey) {
      return;
    }
    lastStageRef.current = stageKey;

    if (Array.isArray(points) && points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (Array.isArray(points) && points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    }
  }, [map, stageKey, points]);

  return null;
};

const LocationMap = ({
  shopLocation,
  customerLocation,
  riderLocation,
  orderStatus = 'pending',
  hasRider = false,
  viewerRole = 'customer',
  shopName = 'Restaurant',
  customerAddress = 'Delivery Address',
  height = '340px',
}) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMin, setRouteDurationMin] = useState(null);
  const lastRouteKeyRef = useRef('');

  // Set safe fallback coordinates
  const validShop = {
    lat: Number(shopLocation?.lat) || 28.6139,
    lng: Number(shopLocation?.lng) || 77.209,
  };

  const validCustomer = {
    lat: Number(customerLocation?.lat) || 28.625,
    lng: Number(customerLocation?.lng) || 77.215,
  };

  let validRider = null;
  if (riderLocation?.lat && riderLocation?.lng) {
    validRider = {
      lat: Number(riderLocation.lat),
      lng: Number(riderLocation.lng),
    };
  } else if (hasRider) {
    validRider = {
      lat: validShop.lat + 0.004,
      lng: validShop.lng + 0.004,
    };
  }

  const isPickedUp = orderStatus === 'out for delivery' || orderStatus === 'delivered';
  const riderAssigned = Boolean(hasRider || validRider);

  // Decide startPoint and endPoint based on Role and Order Status
  let startPoint = null;
  let endPoint = null;
  let routeLabel = '';
  let routeColor = '#2563eb';

  if (viewerRole === 'rider') {
    if (riderAssigned && !isPickedUp) {
      startPoint = validRider;
      endPoint = validShop;
      routeLabel = 'Step 1: Route to Restaurant (Enter Pickup Code at Restaurant)';
      routeColor = '#ea580c';
    } else if (riderAssigned && isPickedUp) {
      startPoint = validRider || validShop;
      endPoint = validCustomer;
      routeLabel = 'Step 2: Route to Customer Location';
      routeColor = '#2563eb';
    }
  } else {
    // Customer View
    if (riderAssigned && validRider) {
      startPoint = validRider;
      endPoint = validCustomer;
      routeLabel = 'Live Path: Delivery Rider → Your Address';
      routeColor = '#2563eb';
    }
  }

  // Fetch road route safely handling StrictMode and fallbacks
  useEffect(() => {
    if (!startPoint || !endPoint) {
      setRouteCoords([]);
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
      return;
    }

    const currentKey = `${startPoint.lat.toFixed(4)},${startPoint.lng.toFixed(4)}->${endPoint.lat.toFixed(4)},${endPoint.lng.toFixed(4)}`;
    
    if (lastRouteKeyRef.current === currentKey) {
      return;
    }
    lastRouteKeyRef.current = currentKey;

    let isMounted = true;

    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (isMounted && data?.routes?.[0]?.geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRouteCoords(coords);
          setRouteDistanceKm((data.routes[0].distance / 1000).toFixed(1));
          setRouteDurationMin(Math.max(1, Math.round(data.routes[0].duration / 60)));
          return;
        }
      } catch {
        // Suppress errors and proceed to fallback
      }

      // Fallback to straight line if OSRM is offline or points are disconnected
      if (isMounted) {
        setRouteCoords([
          [startPoint.lat, startPoint.lng],
          [endPoint.lat, endPoint.lng],
        ]);
      }
    };

    fetchRoadRoute();

    return () => {
      isMounted = false;
      // FIX: Reset ref on unmount so React Strict Mode re-fetches properly
      lastRouteKeyRef.current = '';
    };
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng]);

  // Decide which markers to show
  const showShopMarker = viewerRole === 'rider' ? !isPickedUp : !riderAssigned;
  const showCustomerMarker = viewerRole === 'rider' ? isPickedUp : true;
  const showRiderMarker = Boolean(riderAssigned && validRider);

  const boundsPoints = [];
  if (startPoint && endPoint) {
    boundsPoints.push(startPoint, endPoint);
  } else {
    if (showShopMarker) boundsPoints.push(validShop);
    if (showCustomerMarker) boundsPoints.push(validCustomer);
    if (showRiderMarker) boundsPoints.push(validRider);
  }

  const stageKey = `${viewerRole}-${riderAssigned}-${isPickedUp}`;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {routeLabel ||
              (viewerRole === 'customer'
                ? 'Waiting for a Delivery Rider to accept your order...'
                : 'Accept delivery to view route')}
          </span>
        </div>
        {routeDistanceKm && (
          <span className="bg-white/15 px-2.5 py-1 rounded-full text-[11px]">
            {routeDistanceKm} km • ~{routeDurationMin} mins
          </span>
        )}
      </div>

      <div style={{ height, width: '100%' }}>
        <MapContainer
          center={[validCustomer.lat, validCustomer.lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBoundsOncePerStage points={boundsPoints} stageKey={stageKey} />

          {showShopMarker && (
            <Marker position={[validShop.lat, validShop.lng]} icon={shopIcon}>
              <Popup>
                <strong>🍽️ {shopName}</strong>
                <br />
                Restaurant Pickup Point
              </Popup>
            </Marker>
          )}

          {showRiderMarker && (
            <Marker position={[validRider.lat, validRider.lng]} icon={riderIcon}>
              <Popup>
                <strong>🛵 Delivery Rider</strong>
                <br />
                {isPickedUp ? 'On the way to customer' : 'Heading to restaurant'}
              </Popup>
            </Marker>
          )}

          {showCustomerMarker && (
            <Marker position={[validCustomer.lat, validCustomer.lng]} icon={customerIcon}>
              <Popup>
                <strong>🏠 Customer Address</strong>
                <br />
                {customerAddress}
              </Popup>
            </Marker>
          )}

          {routeCoords.length >= 2 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: routeColor,
                weight: 5,
                opacity: 0.9,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationMap;