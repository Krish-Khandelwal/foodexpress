import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import API from '../../api/axios';

const VendorApprovals = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    try {
      const { data } = await API.get('/admin/pending-vendors');
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/admin/vendor-status/${id}`, { status });
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const pendingVendors = vendors.filter((v) => (v.status || 'pending') === 'pending');
  const existingVendors = vendors.filter((v) => v.status !== 'pending');

  if (loading) return <div className="p-6 text-center">Loading vendor approvals...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Box 1: Newly Registered Restaurant Owners */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="text-amber-600" size={22} />
          <h2 className="text-xl font-extrabold text-gray-900">
            Newly Registered Restaurants (Waiting for Admin Approval)
          </h2>
        </div>

        {pendingVendors.length === 0 ? (
          <p className="text-sm text-gray-600 bg-white p-4 rounded-xl border border-amber-200">
            No newly registered restaurants pending approval.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVendors.map((shop) => (
              <div
                key={shop._id}
                className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{shop.name}</h3>
                    <p className="text-xs text-gray-500">{shop.address}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    NEW • PENDING
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Owner: <strong>{shop.owner?.name}</strong> ({shop.owner?.email})
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => updateStatus(shop._id, 'approved')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    onClick={() => updateStatus(shop._id, 'rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Box 2: Approved / Rejected Restaurants */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">
          Approved &amp; Rejected Restaurants
        </h2>
        <div className="space-y-3">
          {existingVendors.map((shop) => (
            <div
              key={shop._id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-gray-100"
            >
              <div>
                <h4 className="font-bold text-gray-900">{shop.name}</h4>
                <p className="text-xs text-gray-500">
                  {shop.address} • Owner: {shop.owner?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    shop.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {shop.status}
                </span>
                {shop.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(shop._id, 'approved')}
                    className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Approve
                  </button>
                )}
                {shop.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(shop._id, 'rejected')}
                    className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorApprovals;