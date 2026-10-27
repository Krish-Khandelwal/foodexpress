import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    customer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', required: true 
    },

    shop: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Shop', 
      required: true 
    },

    rider: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },

    items: [
      {
        menuItem: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'MenuItem' 
        },
        shop: { 
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Shop' 
        },
        shopName: { 
          type: String, 
          default: '' 
        },
        name: { 
          type: String, 
          required: true 
        },
        price: { 
          type: Number, 
          required: true
        },
        quantity: { 
          type: Number, 
          default: 1, 
          min: 1 
        },
        image: { 
          type: String, 
          default: '' 
        },
        isVeg: { 
          type: Boolean, 
          default: true 
        }
      }
    ],

    totalAmount: {
      type: Number, 
      required: true, 
      min: 0 
    },

    deliveryAddress: { 
      type: String, 
      required: true 
    },

    customerLocation: {
      lat: { 
        type: Number, 
        default: 28.625 
      },
      lng: { 
        type: Number, 
        default: 77.215 
      }
    },

    riderLocation: {
      lat: { 
        type: Number, 
        default: null 
      },
      lng: { 
        type: Number, 
        default: null 
      }
    },

    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'out for delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },

    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'COD'],
      default: 'COD',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },

    razorpayOrderId: { 
      type: String, 
      default: '' 
    },

    razorpayPaymentId: { 
      type: String, 
      default: '' 
    },

    riderOtp: { 
      type: String, 
      default: '' 
    },

    customerOtp: { 
      type: String, 
      default: '' 
    },

    rating: { 
      type: Number, 
      min: 1, 
      max: 5, 
      default: null 
    },

    review: { 
      type: String, 
      default: '' 
    },

    ratedAt: { 
      type: Date, 
      default: null 
    },

    cancelReason: { 
      type: String, 
      default: '' 
    }
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);