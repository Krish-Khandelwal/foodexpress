import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },

    description: { 
      type: String, 
      default: '' 
    },

    address: { 
      type: String, 
      required: true 
    },

    phone: { 
      type: String, 
      default: '' 
    },

    cuisine: { 
      type: String, 
      default: 'Multi-Cuisine' 
    },

    owner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },

    isOpen: { 
      type: Boolean, 
      default: false 
    },

    location: {
      lat: { 
        type: Number, 
        default: 28.6139 
      },
      lng: { 
        type: Number, 
        default: 77.209 
      }
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rating: { 
      type: Number, 
      default: 0 
    },

    numReviews: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

export default mongoose.model('Shop', shopSchema);