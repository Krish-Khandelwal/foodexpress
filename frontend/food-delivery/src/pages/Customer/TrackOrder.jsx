import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LocationMap from '../../components/Maps/LocationMap';
import * as orderApi from '../../api/orderApi';
import io from 'socket.io-client';

const TrackOrder = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    const fetchOrder = async () => {
      try {
        const { data } = await orderApi.getOrderById(orderId);
        setOrder(data);
        if (data.status === 'OUT_FOR_DELIVERY') {
          socket.emit('joinOrderRoom', orderId);
        }
      } catch (error) {
        console.error('Error fetching order', error);
      }
    };
    fetchOrder();

    socket.on('updateLocation', (coords) => setDeliveryCoords(coords));

    return () => {
      socket.off('updateLocation');
      socket.disconnect();
    };
  }, [orderId]);

  if (!order) return <div className="p-10 text-center">Loading order...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Order #{order._id.substring(0, 8)}</h1>
            <p className="text-gray-500">Status: <span className="font-bold text-blue-600">{order.status}</span></p>
          </div>
        </div>

        {order.status === 'OUT_FOR_DELIVERY' ? (
          <div className="h-80 w-full bg-gray-100">
            {deliveryCoords ? (
              <LocationMap lat={deliveryCoords.lat} lng={deliveryCoords.lng} popupText="Delivery Partner" />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Waiting for GPS signal...</div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center bg-blue-50 text-blue-800">
            Map tracking begins when the order is OUT_FOR_DELIVERY.
          </div>
        )}
      </div>
    </div>
  );
};
export default TrackOrder;