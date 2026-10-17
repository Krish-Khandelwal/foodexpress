import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Import Route Files
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js'; // Ensure this line exists
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes); // Ensure this line exists! This is what fixes the Customer loading screen.
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));