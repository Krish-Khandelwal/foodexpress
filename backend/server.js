import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import initializeSocket from './sockets/mapTrackerSocket.js';
import { seedAdminUser, ensureDefaultCategories } from './controllers/adminController.js';

// Import Route Files
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

// Connect to MongoDB and automatically seed the Admin user & default categories
connectDB().then(async () => {
  await seedAdminUser();
  await ensureDefaultCategories();
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

initializeSocket(io);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FoodExpress Backend' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server & Socket.IO running on port ${PORT}`));