import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store,
  AlertOctagon,
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  RefreshCw,
  Phone,
  Mail,
  KeyRound,
  Settings,
  X,
  MapPin,
  Navigation,
} from 'lucide-react';
import API from '../../api/axios';

const shopPinIcon = L.divIcon({
  className: 'owner-shop-pin',
  html: `<div style="background:#ea580c;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);">🍽️</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Cleans and formats address strictly in English (strips any Hindi/Devanagari characters)
const formatEnglishAddress = (rawText, addressObj = {}) => {
  if (addressObj && Object.keys(addressObj).length > 0) {
    const parts = [
      addressObj.house_number,
      addressObj.road || addressObj.pedestrian || addressObj.suburb,
      addressObj.neighbourhood || addressObj.residential,
      addressObj.city_district,
      addressObj.city || addressObj.town || addressObj.state_district || 'New Delhi',
      addressObj.state || 'Delhi',
      addressObj.postcode,
    ]
      .filter(Boolean)
      .map((part) => String(part).replace(/[\u0900-\u097F]+/g, '').trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return [...new Set(parts)].join(', ');
    }
  }

  if (!rawText) return '';
  const cleaned = String(rawText)
    .replace(/[\u0900-\u097F]+/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
  return cleaned || 'New Delhi, Delhi, India';
};

// Helper: Calculate Menu Items Subtotal, 5% Tax, and Restaurant Owner Amount (Subtotal + 5% Tax)
const getOwnerOrderAmounts = (order) => {
  let itemsSubtotal = 0;
  if (Array.isArray(order?.items) && order.items.length > 0) {
    itemsSubtotal = order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
  } else {
    const rawTotal = Number(order?.totalAmount) || 0;
    itemsSubtotal = rawTotal > 40 ? Math.round((rawTotal - 40) / 1.05) : rawTotal;
  }

  const taxAmount = Math.round(itemsSubtotal * 0.05);
  const ownerTotal = itemsSubtotal + taxAmount;

  return { itemsSubtotal, taxAmount, ownerTotal };
};

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position?.lat && position?.lng) {
      map.setView([position.lat, position.lng], map.getZoom() || 15);
    }
  }, [position?.lat, position?.lng, map]);
  return null;
};

const DraggableShopMarker = ({ position, onLocationSelect }) => {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onLocationSelect(latlng.lat, latlng.lng);
        }
      },
    }),
    [onLocationSelect]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={shopPinIcon}
    />
  );
};

const ShopDashboard = () => {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [locating, setLocating] = useState(false);

  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    phone: '',
    cuisine: '',
    description: '',
    isOpen: true,
    location: {
      lat: 28.6139,
      lng: 77.209,
    },
  });

  const navigate = useNavigate();

  // Polling only updates shop status & incoming orders; it NEVER overwrites shopForm while typing
  const fetchOwnerData = async () => {
    try {
      const [shopRes, ordersRes] = await Promise.all([
        API.get('/auth/my-shop'),
        API.get('/orders/owner-orders'),
      ]);
      if (shopRes.data) {
        setShop(shopRes.data);
      }
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Error loading owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
    const interval = setInterval(fetchOwnerData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Initialize form state ONLY when opening the Restaurant Settings modal
  const handleOpenSettings = () => {
    setShopForm({
      name: shop?.name || '',
      address: shop?.address || 'Connaught Place, New Delhi',
      phone: shop?.phone || '',
      cuisine: shop?.cuisine || 'Multi-Cuisine',
      description: shop?.description || '',
      isOpen: shop?.isOpen !== undefined ? Boolean(shop.isOpen) : true,
      location: {
        lat: Number(shop?.location?.lat) || 28.6139,
        lng: Number(shop?.location?.lng) || 77.209,
      },
    });
    setShowSettingsModal(true);
  };

  // Reverse geocode map marker coordinates in English and update shopForm
  const reverseGeocodeShopLocation = async (lat, lng) => {
    setShopForm((prev) => ({
      ...prev,
      location: { lat, lng },
    }));

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );
      const data = await res.json();
      if (data?.display_name || data?.address) {
        const englishAddr = formatEnglishAddress(data.display_name, data.address);
        setShopForm((prev) => ({
          ...prev,
          address: englishAddr || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
          location: { lat, lng },
        }));
      } else {
        setShopForm((prev) => ({
          ...prev,
          address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
          location: { lat, lng },
        }));
      }
    } catch {
      setShopForm((prev) => ({
        ...prev,
        address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
        location: { lat, lng },
      }));
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await reverseGeocodeShopLocation(latitude, longitude);
        setLocating(false);
      },
      () => {
        alert(
          'Unable to retrieve your current location. Please allow browser location access or click on the map.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveShopSettings = async (e) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const cleanAddress = formatEnglishAddress(shopForm.address) || shopForm.address;
      const payload = {
        ...shopForm,
        address: cleanAddress,
        location: {
          lat: Number(shopForm.location?.lat) || 28.6139,
          lng: Number(shopForm.location?.lng) || 77.209,
        },
      };
      const { data } = await API.put('/auth/my-shop', payload);
      setShop(data.shop);
      setShowSettingsModal(false);
      alert('Restaurant details and location updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update restaurant details');
    } finally {
      setSavingShop(false);
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status });
      fetchOwnerData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Restaurant Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ADMIN REJECTION ALERT BOX */}
      {shop?.status === 'rejected' && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-red-600 text-white p-3 rounded-2xl shrink-0">
              <AlertOctagon size={30} />
            </div>
            <div>
              <h2 className="text-xl font-black text-red-900">
                Your Restaurant Has Been Rejected by Admin
              </h2>
              <p className="text-sm text-red-700 mt-1 font-medium">
                Your restaurant <strong>&ldquo;{shop.name}&rdquo;</strong> is currently rejected and hidden from customers. Please contact the Admin for approval.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-bold text-red-800">
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-red-200">
                  <Mail size={14} /> admin@foodexpress.com
                </span>
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-red-200">
                  <Phone size={14} /> +91 9999999999
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PENDING APPROVAL BOX */}
      {shop?.status === 'pending' && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="bg-amber-500 text-white p-2.5 rounded-xl shrink-0">
            <Clock size={26} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-amber-900">
              Restaurant Registration Pending Admin Approval
            </h2>
            <p className="text-sm text-amber-800 mt-0.5">
              Your newly registered restaurant <strong>&ldquo;{shop.name}&rdquo;</strong> has been sent to the Admin under <em>Restaurant &amp; Vendor Approvals</em>. Once approved, your restaurant will go live for customers.
            </p>
          </div>
        </div>
      )}

      {/* Top Header with "Restaurant Settings" Button and "Manage Food Menu" Button */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
            <Store size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-gray-900">
                {shop?.name || 'Restaurant Dashboard'}
              </h1>
              {shop?.status === 'approved' && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={13} /> Approved
                </span>
              )}
              {shop?.rating > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  ★ {shop.rating} ({shop.numReviews} reviews)
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formatEnglishAddress(shop?.address)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition cursor-pointer shadow-sm"
          >
            <Settings size={16} /> Restaurant Settings
          </button>

          <button
            type="button"
            onClick={() => navigate('/owner/menu')}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer shadow-sm"
          >
            <UtensilsCrossed size={16} /> Manage Food Menu
          </button>

          <button
            type="button"
            onClick={fetchOwnerData}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3.5 py-2.5 rounded-xl text-sm cursor-pointer"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Incoming & Active Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-gray-900">
          Incoming &amp; Active Orders ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
            No orders received yet.
          </div>
        ) : (
          orders.map((order) => {
            const { itemsSubtotal, taxAmount, ownerTotal } =
              getOwnerOrderAmounts(order);

            return (
              <div
                key={order._id}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap justify-between items-start gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      ORDER #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <h3 className="font-bold text-gray-900">
                      Customer: {order.customer?.name || 'Customer'} (
                      {order.customer?.phone || 'N/A'})
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatEnglishAddress(order.deliveryAddress)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {order.status}
                    </span>
                    <p className="text-lg font-black text-gray-900 mt-1">
                      ₹{ownerTotal}
                    </p>
                    <p className="text-[11px] font-semibold text-gray-500">
                      ₹{itemsSubtotal} + ₹{taxAmount} (5% tax)
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 text-sm">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-700">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-semibold">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Customer Food Quality Rating if rated */}
                {order.rating && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                    <span className="font-bold text-amber-800">
                      Customer Food Rating: {'★'.repeat(order.rating)} ({order.rating}/5)
                    </span>
                    {order.review && (
                      <p className="text-gray-700 mt-1 italic">
                        &ldquo;{order.review}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Status Controls + Restaurant Pickup Code for Delivery Rider */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOrderStatus(order._id, 'preparing')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          order.status === 'preparing'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        Mark Preparing
                      </button>
                      <button
                        onClick={() => handleOrderStatus(order._id, 'ready')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          order.status === 'ready'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        Mark Ready for Pickup
                      </button>
                    </div>

                    {/* Restaurant Pickup Code Box on Restaurant Owner Side */}
                    {order.riderOtp && order.status !== 'out for delivery' && (
                      <div className="flex items-center gap-3 bg-orange-50 px-4 py-2.5 rounded-xl border-2 border-orange-300">
                        <KeyRound size={18} className="text-orange-600" />
                        <div>
                          <p className="text-[11px] font-bold uppercase text-orange-800">
                            Restaurant Pickup Code (Give to Rider)
                          </p>
                          <p className="font-mono text-lg font-black text-gray-900 tracking-widest">
                            {order.riderOtp}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Restaurant Settings Modal with Map & Upload Current Location */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-orange-600" />
                Restaurant Settings
              </h2>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveShopSettings} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    required
                    value={shopForm.name}
                    onChange={(e) =>
                      setShopForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={shopForm.phone}
                    onChange={(e) =>
                      setShopForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Restaurant Location Map + Upload Current Location Button + Address Field */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block font-semibold text-gray-700">
                    Restaurant Location &amp; Address (Click/drag pin on map or type below)
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition disabled:opacity-50"
                  >
                    <Navigation size={14} />
                    {locating ? 'Detecting Location...' : 'Upload Current Location'}
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden border border-gray-300 h-56">
                  <MapContainer
                    center={[
                      shopForm.location?.lat || 28.6139,
                      shopForm.location?.lng || 77.209,
                    ]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <RecenterMap position={shopForm.location} />
                    <DraggableShopMarker
                      position={shopForm.location}
                      onLocationSelect={reverseGeocodeShopLocation}
                    />
                  </MapContainer>
                </div>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Type your restaurant address or select on the map above..."
                    value={shopForm.address}
                    onChange={(e) =>
                      setShopForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Pinned Coordinates: {Number(shopForm.location?.lat || 28.6139).toFixed(5)},{' '}
                  {Number(shopForm.location?.lng || 77.209).toFixed(5)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Cuisine Type
                  </label>
                  <input
                    type="text"
                    value={shopForm.cuisine}
                    onChange={(e) =>
                      setShopForm((prev) => ({
                        ...prev,
                        cuisine: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={shopForm.description}
                    onChange={(e) =>
                      setShopForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {shop?.status === 'approved' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="shopOpenToggle"
                    checked={shopForm.isOpen}
                    onChange={(e) =>
                      setShopForm((prev) => ({
                        ...prev,
                        isOpen: e.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="shopOpenToggle"
                    className="font-semibold text-gray-700 cursor-pointer"
                  >
                    Restaurant is Open for Orders
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShop}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 cursor-pointer disabled:opacity-50"
                >
                  {savingShop ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboard;