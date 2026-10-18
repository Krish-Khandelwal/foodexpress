import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../api/axios';

const VendorApprovals = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/admin/pending-vendors');
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/admin/vendor-status/${id}`, { status });
      setNotice(`Vendor status updated to ${status}`);
      fetchVendors();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Failed to update vendor status');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Restaurant & Vendor Approvals</h1>
      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm font-medium border border-blue-200">
          {notice}
        </div>
      )}
      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p className="text-gray-500 bg-white p-6 rounded-lg border">No vendors registered yet.</p>
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white p-6 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{vendor.name}</h2>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      vendor.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : vendor.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {vendor.status || 'approved'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  Owner: {vendor.owner?.name || 'Unknown'} ({vendor.owner?.email || 'No email'})
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Address: {vendor.address} • Cuisine: {vendor.cuisine}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(vendor._id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-1 text-sm font-semibold cursor-pointer"
                >
                  <Check size={16} /> Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate(vendor._id, 'rejected')}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 flex items-center gap-1 text-sm font-semibold cursor-pointer"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorApprovals;