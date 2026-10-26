import 'dotenv/config'; // Automatically loads .env before importing app
import app from './app.js';
import connectDB from './config/db.js';
import { seedAdminUser, ensureDefaultCategories } from './controllers/adminController.js';

// Connect to MongoDB and seed default Admin & Categories
connectDB()
  .then(async () => {
    await seedAdminUser();
    await ensureDefaultCategories();

    // Start Express Server only after successful DB connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit process if DB connection fails
  });