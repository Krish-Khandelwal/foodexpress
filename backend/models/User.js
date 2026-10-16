import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    role: {
        type: String,
        enum: ['USER', 'OWNER', 'DELIVERY_BOY', 'ADMIN'],
        default: 'USER'
    },
    phone: { type: String },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;