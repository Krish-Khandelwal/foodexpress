import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    address: { type: String, required: true },
    phone: { type: String, default: '' },
    cuisine: { type: String, default: 'Multi-Cuisine' },
    image: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Shop', shopSchema);