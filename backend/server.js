import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { seedAdminUser, ensureDefaultCategories } from './controllers/adminController.js';

connectDB()
  .then(async () => {
    await seedAdminUser();
    await ensureDefaultCategories();

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });