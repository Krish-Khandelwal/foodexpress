import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

const VendorApprovals = () => {
  const [vendors, setVendors] = useState([
    { _id: '1', shopName: 'Delhi Organics', ownerName: 'Rahul K.', status: 'PENDING' }
  ]);

  const handleApproval = (id) => setVendors(vendors.filter(v => v._id !== id));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Vendor Approvals</h1>
      {vendors.map(vendor => (
        <div key={vendor._id} className="bg-white p-6 rounded-lg border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{vendor.shopName}</h2>
            <p className="text-gray-600">Owner: {vendor.ownerName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleApproval(vendor._id)} className="bg-green-600 text-white px-4 py-2 rounded flex gap-1"><Check size={18}/> Approve</button>
            <button onClick={() => handleApproval(vendor._id)} className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-200 flex gap-1"><X size={18}/> Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
};
export default VendorApprovals;