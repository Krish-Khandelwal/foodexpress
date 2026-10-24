import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  XCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Bike,
} from 'lucide-react';
import API from '../../api/axios';
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

const TrackOrder = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
      if (data.rating) {
        setRating(data.rating);
        setReview(data.review || '');
      }
    } catch (err) {
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const { data } = await API.put(`/orders/${id}/cancel`, {
        reason: 'Cancelled by customer',
      });
      setOrder(data.order);
      alert('Your order has been cancelled.');
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleRateFood = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      const { data } = await API.post(`/orders/${id}/rate`, {
        rating,
        review,
      });
      setOrder(data.order);
      alert('Thank you for rating the food quality!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500">Order not found.</div>;
  }

  const canCancel =
    order.status !== 'delivered' && order.status !== 'cancelled';
  const englishAddress = cleanEnglishAddress(order.deliveryAddress);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:underline"
      >
        <ArrowLeft size={16} /> Back to Home &amp; Menu
      </Link>

      {/* Order Summary Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-gray-400">
            ORDER #{order._id.slice(-6).toUpperCase()}
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">
            {order.shop?.name || 'Restaurant Order'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Delivering to: <strong>{englishAddress}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase ${
              order.status === 'delivered'
                ? 'bg-emerald-100 text-emerald-800'
                : order.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {order.status}
          </span>

          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <XCircle size={15} />
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Customer Delivery OTP Box */}
      {order.status !== 'cancelled' && order.status !== 'delivered' && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-600" size={28} />
            <div>
              <h3 className="font-extrabold text-gray-900">
                Your Delivery Verification OTP
              </h3>
              <p className="text-xs text-gray-600">
                Share this 4-digit OTP with your Delivery Rider only when your food arrives at your doorstep.
              </p>
            </div>
          </div>
          <div className="bg-white border-2 border-emerald-500 text-emerald-900 font-mono text-2xl font-black px-5 py-2 rounded-xl tracking-widest">
            {order.customerOtp}
          </div>
        </div>
      )}

      {/* Live Map: Once rider accepts delivery, customer ONLY sees path between Delivery Rider and their address */}
      {order.status !== 'cancelled' && (
        <div className="space-y-2">
          {order.rider ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-blue-900">
              <Bike size={16} className="text-blue-600" />
              Delivery Rider ({order.rider.name || 'Assigned'}) has accepted your order! Showing direct path between Rider and your address.
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-amber-900">
              <Clock size={16} className="text-amber-600" />
              Waiting for a Delivery Rider to accept your delivery. Once accepted, you will see the live path between the rider and your address.
            </div>
          )}

          <LocationMap
            viewerRole="customer"
            hasRider={Boolean(order.rider)}
            orderStatus={order.status}
            shopLocation={order.shop?.location}
            customerLocation={order.customerLocation}
            riderLocation={order.riderLocation}
            shopName={order.shop?.name}
            customerAddress={englishAddress}
            height="360px"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ordered Items */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">Order Items</h2>
          <div className="divide-y divide-gray-100 text-sm">
            {order.items.map((item, index) => (
              <div key={index} className="py-2.5 flex justify-between items-center">
                <span>
                  <strong>{item.quantity}x</strong> {item.name}
                </span>
                <span className="font-bold text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-black text-gray-900">
            <span>Total Amount</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>

        {/* Food Quality Rating System */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" size={20} />
              Rate Food Quality
            </h2>

            {order.rating ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={22}
                      className={
                        star <= order.rating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-300'
                      }
                    />
                  ))}
                  <span className="ml-2 text-sm font-extrabold text-gray-900">
                    {order.rating} / 5
                  </span>
                </div>
                {order.review && (
                  <p className="text-sm text-gray-700 italic">
                    &ldquo;{order.review}&rdquo;
                  </p>
                )}
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Your food quality rating has been saved!
                </p>
              </div>
            ) : (
              <form onSubmit={handleRateFood} className="space-y-4">
                <p className="text-xs text-gray-500">
                  How was the food quality from <strong>{order.shop?.name}</strong>?
                </p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 cursor-pointer transition transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={
                          star <= (hoverRating || rating)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-gray-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-gray-700">
                    {rating} Star{rating > 1 ? 's' : ''}
                  </span>
                </div>

                <textarea
                  rows={3}
                  placeholder="Write your feedback about taste, freshness, and packaging (optional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                <button
                  type="submit"
                  disabled={submittingRating}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition disabled:opacity-50"
                >
                  {submittingRating ? 'Submitting Rating...' : 'Submit Food Rating'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;