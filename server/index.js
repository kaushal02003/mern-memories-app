
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import postRoutes from './routes/posts.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cors());

// Support both /api/posts (Vercel) and /posts (old local path)
app.use('/api/posts', postRoutes);
app.use('/posts', postRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const CONNECTION_URL = process.env.CONNECTION_URL;
const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return; // reuse existing connection on warm starts
  await mongoose.connect(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true });
};

// Vercel serverless exports handler; local dev still starts a server
if (process.env.VERCEL) {
  connectDB().catch((error) => console.error('Mongo connection error:', error));
} else {
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((error) => console.error('Mongo connection error:', error.message));
}

export const handler = serverless(app);
export default handler;