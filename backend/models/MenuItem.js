import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'Main Course' },
    image: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: true }
);

menuItemSchema.pre('save', function () {
  if (this.isModified('image') && this.image) {
    this.imageUrl = this.image;
  } else if (this.isModified('imageUrl') && this.imageUrl) {
    this.image = this.imageUrl;
  }
});

export default mongoose.model('MenuItem', menuItemSchema);