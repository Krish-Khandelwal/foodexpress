import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

export const isRazorpayConfigured = () => {
  return (
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) &&
    process.env.RAZORPAY_KEY_ID !== 'dummy_key' &&
    process.env.RAZORPAY_KEY_SECRET !== 'dummy_secret'
  );
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export default razorpay;