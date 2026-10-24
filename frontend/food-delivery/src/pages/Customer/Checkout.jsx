import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, CreditCard, Banknote } from 'lucide-react';
import API from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { loadRazorpay } from '../../utils/loadRazorpay';

const customerPinIcon = L.divIcon({
  className: 'checkout-location-pin',
  html: `<div style="background:#ea580c;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Helper to ensure address is strictly in English (removes any Hindi/Devanagari script)
const formatEnglishAddress = (rawText, addressObj = {}) => {
  if (addressObj && Object.keys(addressObj).length > 0) {
    const parts = [
      addressObj.house_number,
      addressObj.road || addressObj.pedestrian || addressObj.suburb,
      addressObj.neighbourhood || addressObj.residential,
      addressObj.city_district || addressObj.Variables,
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
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return cleaned || 'New Delhi, Delhi, India';
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

const DraggableLocationMarker = ({ position, onLocationSelect }) => {
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
      icon={customerPinIcon}
    />
  );
};

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [deliveryAddress, setDeliveryAddress] = useState('Connaught Place, New Delhi');
  const [customerLocation, setCustomerLocation] = useState({
    lat: 28.6139,
    lng: 77.209,
  });
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const deliveryFee = cartTotal > 0 ? 40 : 0;
  const taxes = Math.round(cartTotal * 0.05);
  const grandTotal = cartTotal + deliveryFee + taxes;

  // Fetches address strictly in English from OpenStreetMap Nominatim
  const reverseGeocodeAndFill = async (lat, lng) => {
    setCustomerLocation({ lat, lng });
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
        setDeliveryAddress(
          englishAddr || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
        );
      } else {
        setDeliveryAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      }
    } catch {
      setDeliveryAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
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
        await reverseGeocodeAndFill(latitude, longitude);
        setLocating(false);
      },
      () => {
        alert(
          'Unable to retrieve your current location. Please allow location access or click on the map.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const shopIds = new Set(
      cartItems
        .map((i) => i.shopId || i.shop?._id || i.shop)
        .filter(Boolean)
        .map(String)
    );
    if (shopIds.size > 1) {
      alert('You can only order food from 1 restaurant at a time!');
      return;
    }

    const cleanAddress = formatEnglishAddress(deliveryAddress) || deliveryAddress;

    setLoading(true);
    try {
      const primaryShopId =
        cartItems[0]?.shopId || cartItems[0]?.shop?._id || cartItems[0]?.shop;

      if (paymentMethod === 'ONLINE') {
        const sdkLoaded = await loadRazorpay();
        if (!sdkLoaded) {
          alert('Razorpay SDK failed to load. Switching to Cash on Delivery.');
        } else {
          const { data: rzpOrder } = await API.post('/orders/create-razorpay-order', {
            amount: grandTotal,
          });
          const options = {
            key: rzpOrder.keyId,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            name: 'FoodExpress',
            description: 'Food Order Payment',
            order_id: rzpOrder.id,
            handler: async (response) => {
              const { data } = await API.post('/orders', {
                shopId: primaryShopId,
                items: cartItems,
                totalAmount: grandTotal,
                deliveryAddress: cleanAddress,
                customerLocation,
                paymentMethod: 'ONLINE',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              clearCart();
              navigate(`/track-order/${data.order?._id || data._id}`);
            },
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
          setLoading(false);
          return;
        }
      }

      const { data } = await API.post('/orders', {
        shopId: primaryShopId,
        items: cartItems,
        totalAmount: grandTotal,
        deliveryAddress: cleanAddress,
        customerLocation,
        paymentMethod: 'COD',
      });
      clearCart();
      navigate(`/track-order/${data.order?._id || data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Checkout</h1>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {/* Delivery Address + Interactive Map & Current Location Button */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-bold text-gray-700">
                Delivery Address (Click or drag marker on map, or use current location)
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

            <div className="rounded-2xl overflow-hidden border border-gray-300 h-64">
              <MapContainer
                center={[customerLocation.lat, customerLocation.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap position={customerLocation} />
                <DraggableLocationMarker
                  position={customerLocation}
                  onLocationSelect={reverseGeocodeAndFill}
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
                placeholder="Select on map or type your full delivery address in English..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="text-xs text-gray-400">
              Selected Coordinates: {customerLocation.lat.toFixed(5)},{' '}
              {customerLocation.lng.toFixed(5)}
            </p>
          </div>

          {/* Payment Method as Radio Buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setPaymentMethod('COD')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                  paymentMethod === 'COD'
                    ? 'border-orange-600 bg-orange-50/60'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="w-4 h-4 accent-orange-600"
                />
                <Banknote size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Cash on Delivery (COD)
                  </p>
                  <p className="text-xs text-gray-500">Pay when your order arrives</p>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod('ONLINE')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                  paymentMethod === 'ONLINE'
                    ? 'border-orange-600 bg-orange-50/60'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ONLINE"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                  className="w-4 h-4 accent-orange-600"
                />
                <CreditCard size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Online Payment (Razorpay)
                  </p>
                  <p className="text-xs text-gray-500">UPI, Card, NetBanking</p>
                </div>
              </label>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (5%)</span>
              <span>₹{taxes}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between font-black text-base pt-2 border-t">
              <span>Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${grandTotal}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;