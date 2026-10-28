import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  Bike,
  KeyRound,
  CheckCircle2,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import API from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import LocationMap from '../../components/Maps/LocationMap';

const cleanEnglishAddress = (text) => {
  if (!text) return 'Customer Address';
  const cleaned = String(text)
    .replace(/[\u0900-\u097F]+/g, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
  return cleaned || 'New Delhi, Delhi, India';
};

// Helper: Calculate Rider Delivery Fee (₹40) and Menu Items Cost (e.g. ₹100)
const getRiderOrderAmounts = (order) => {
  let menuItemCost = 0;
  if (Array.isArray(order?.items) && order.items.length > 0) {
    menuItemCost = order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
  } else {
    const rawTotal = Number(order?.totalAmount) || 0;
    menuItemCost = rawTotal > 40 ? Math.round((rawTotal - 40) / 1.05) : rawTotal;
  }

  const deliveryFee = 40;
  return { deliveryFee, menuItemCost };
};

const DeliveryDashboard = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [pickupCodeInput, setPickupCodeInput] = useState({});
  const [deliveryOtpInput, setDeliveryOtpInput] = useState({});
  const [liveCoords, setLiveCoords] = useState(null);
  const [loading, setLoading] = useState(true);

  const ordersRef = useRef([]);
  const lastGpsSentTimeRef = useRef(0);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/rider/available');
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching rider orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000);
    return () => clearInterval(interval);
  }, []);

  const syncRiderLocationToActiveOrders = async (lat, lng, forceSend = false) => {
    setLiveCoords({ lat, lng });

    const now = Date.now();
    if (!forceSend && now - lastGpsSentTimeRef.current < 8000) {
      return;
    }
    lastGpsSentTimeRef.current = now;

    const myActiveOrders = ordersRef.current.filter((ord) => {
      const riderId = ord.rider?._id || ord.rider;
      const isMine = riderId && String(riderId) === String(user?._id);
      const isActive = ord.status !== 'delivered' && ord.status !== 'cancelled';
      return isMine && isActive;
    });

    if (myActiveOrders.length === 0) return;

    await Promise.allSettled(
      myActiveOrders.map((ord) =>
        API.put(`/orders/${ord._id}/rider-location`, { lat, lng })
      )
    );
  };

  useEffect(() => {
    if (!navigator.geolocation || !user?._id) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        syncRiderLocationToActiveOrders(latitude, longitude, false);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?._id]);

  const handleManualGpsSync = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await syncRiderLocationToActiveOrders(latitude, longitude, true);
        fetchOrders();
      },
      () => {
        alert('Please allow browser location access to update your live GPS position.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAcceptDelivery = async (orderId) => {
    try {
      const payload = liveCoords
        ? { lat: liveCoords.lat, lng: liveCoords.lng }
        : {};
      await API.put(`/orders/${orderId}/accept-delivery`, payload);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not accept delivery');
    }
  };

  const handleVerifyPickupCode = async (orderId) => {
    const code = pickupCodeInput[orderId];
    if (!code) {
      alert('Please enter the 4-digit Pickup Code from the Restaurant Owner');
      return;
    }
    try {
      await API.post(`/orders/${orderId}/verify-pickup-otp`, {
        otp: code,
        ...(liveCoords ? { lat: liveCoords.lat, lng: liveCoords.lng } : {}),
      });
      setPickupCodeInput((prev) => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid Pickup Code');
    }
  };

  const handleVerifyDeliveryOtp = async (orderId) => {
    const otp = deliveryOtpInput[orderId];
    if (!otp) {
      alert('Please enter the 4-digit Customer Delivery OTP');
      return;
    }
    try {
      await API.post(`/orders/${orderId}/verify-delivery-otp`, { otp });
      setDeliveryOtpInput((prev) => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid Customer Delivery OTP');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Rider Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
            <Bike size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Delivery Rider Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Accept Ready orders, navigate to the restaurant, verify the pickup code, then deliver to the customer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualGpsSync}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
          >
            <Navigation size={15} /> Sync Live GPS
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm cursor-pointer"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-500">
          No Ready or active delivery orders right now. Orders will appear here once a Restaurant Owner marks them Ready.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isAcceptedByMe =
              order.rider &&
              String(order.rider._id || order.rider) === String(user?._id);
            const isPickedUp = order.status === 'out for delivery';
            const isDelivered = order.status === 'delivered';
            const englishCustomerAddress = cleanEnglishAddress(order.deliveryAddress);
            const { deliveryFee, menuItemCost } = getRiderOrderAmounts(order);

            return (
              <div
                key={order._id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      ORDER #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                      🍽️ {order.shop?.name || 'Restaurant'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {cleanEnglishAddress(order.shop?.address)}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-2 flex items-center gap-1">
                      <MapPin size={15} className="text-emerald-600 shrink-0" />
                      <span>
                        Customer name: {order.customer?.name || 'Customer'} | Phone: {order.customer?.phone || 'N/A'} | Address: {englishCustomerAddress}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPickedUp
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                    <p className="text-xl font-black text-gray-900 mt-1">
                      ₹{deliveryFee}
                    </p>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">
                      Menu Item Cost: ₹{menuItemCost}
                    </p>
                  </div>
                </div>

                {!order.rider && order.status === 'ready' && !isDelivered && (
                  <button
                    onClick={() => handleAcceptDelivery(order._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2"
                  >
                    <Navigation size={18} /> Accept Delivery
                  </button>
                )}

                {isAcceptedByMe && !isDelivered && (
                  <div className="space-y-4">
                    <LocationMap
                      viewerRole="rider"
                      hasRider={true}
                      orderStatus={order.status}
                      shopLocation={order.shop?.location}
                      customerLocation={order.customerLocation}
                      riderLocation={liveCoords || order.riderLocation}
                      shopName={order.shop?.name}
                      customerAddress={englishCustomerAddress}
                      height="320px"
                    />

                    {!isPickedUp ? (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-black uppercase text-orange-700">
                            Step 1 of 2 • Navigate to Restaurant
                          </span>
                          <h4 className="font-extrabold text-gray-900 text-base">
                            Enter the Pickup Code from the Restaurant Owner
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Ask the Restaurant Owner for the 4-digit Pickup Code to unlock the customer&apos;s delivery route.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="Enter Pickup Code"
                            value={pickupCodeInput[order._id] || ''}
                            onChange={(e) =>
                              setPickupCodeInput({
                                ...pickupCodeInput,
                                [order._id]: e.target.value,
                              })
                            }
                            className="border border-orange-300 bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold w-44"
                          />
                          <button
                            onClick={() => handleVerifyPickupCode(order._id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <KeyRound size={16} /> Verify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-black uppercase text-blue-700">
                            Step 2 of 2 • Out for Delivery to Customer
                          </span>
                          <h4 className="font-extrabold text-gray-900 text-base">
                            Follow Map Path to Customer &amp; Enter Delivery OTP
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Ask the customer for their 4-digit Delivery OTP upon arrival.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="Customer OTP"
                            value={deliveryOtpInput[order._id] || ''}
                            onChange={(e) =>
                              setDeliveryOtpInput({
                                ...deliveryOtpInput,
                                [order._id]: e.target.value,
                              })
                            }
                            className="border border-blue-300 bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold w-36"
                          />
                          <button
                            onClick={() => handleVerifyDeliveryOtp(order._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={16} /> Complete Delivery
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;