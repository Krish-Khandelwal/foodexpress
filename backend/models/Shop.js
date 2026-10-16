import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopName: { type: String, required: true },
  address: { type: String, required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  imageUrl: { type: String },
  approvalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  isOpen: { type: Boolean, default: false }
}, { timestamps: true });

const Shop = mongoose.model('Shop', shopSchema);
export default Shop;