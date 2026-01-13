import mongoose from 'mongoose';
import { getPosts, createPost, updatePost, deletePost, likePost } from '../server/controllers/posts.js';

const CONNECTION_URL = process.env.CONNECTION_URL;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(CONNECTION_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();

    // Map query params to params for Express controller compatibility
    const pathParts = req.url.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart && lastPart !== 'posts' && lastPart.includes('?') === false) {
      req.params = { id: lastPart.replace('likePost', '').replace('/', '') };
    } else {
      req.params = {};
    }

    if (req.method === 'GET' && !req.params.id) {
      return await getPosts(req, res);
    } else if (req.method === 'POST') {
      return await createPost(req, res);
    } else if (req.method === 'PATCH' && req.params.id) {
      if (req.url.includes('/likePost')) {
        return await likePost(req, res);
      }
      return await updatePost(req, res);
    } else if (req.method === 'DELETE' && req.params.id) {
      return await deletePost(req, res);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
}
