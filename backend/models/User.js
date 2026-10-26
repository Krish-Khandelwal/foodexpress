import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    role: {
      type: String,
      enum: ['customer', 'owner', 'rider', 'admin'],
      default: 'customer',
      lowercase: true,
    },
    refreshToken: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Hash password before saving to database
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate short-lived Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret_foodexpress',
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
    }
  );
};

// Generate long-lived Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret_foodexpress',
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    }
  );
};

const User = mongoose.model('User', userSchema);
export default User;