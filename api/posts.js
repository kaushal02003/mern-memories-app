import mongoose from 'mongoose';

const CONNECTION_URL = process.env.CONNECTION_URL;

// Define the Post schema and model inline
const postSchema = mongoose.Schema({
    title: String,
    message: String,
    creator: String,
    tags: [String],
    selectedFile: String,
    likeCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
});

const PostMessage = mongoose.models.PostMessage || mongoose.model('PostMessage', postSchema);

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

    // Parse URL to get ID if present
    const urlParts = req.url.split('/').filter(p => p && p !== 'api' && p !== 'posts');
    const id = urlParts[0]?.split('?')[0];
    const isLikePost = req.url.includes('likePost');

    // GET all posts
    if (req.method === 'GET' && !id) {
      const posts = await PostMessage.find();
      return res.status(200).json(posts);
    }

    // GET single post
    if (req.method === 'GET' && id) {
      const post = await PostMessage.findById(id);
      return res.status(200).json(post);
    }

    // CREATE post
    if (req.method === 'POST') {
      const { title, message, selectedFile, creator, tags } = req.body;
      const newPost = new PostMessage({ title, message, selectedFile, creator, tags });
      await newPost.save();
      return res.status(201).json(newPost);
    }

    // UPDATE post
    if (req.method === 'PATCH' && id && !isLikePost) {
      const { title, message, creator, selectedFile, tags } = req.body;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).send(`No post with id: ${id}`);
      }
      const updatedPost = { creator, title, message, tags, selectedFile, _id: id };
      await PostMessage.findByIdAndUpdate(id, updatedPost, { new: true });
      return res.json(updatedPost);
    }

    // LIKE post
    if (req.method === 'PATCH' && id && isLikePost) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).send(`No post with id: ${id}`);
      }
      const post = await PostMessage.findById(id);
      const updatedPost = await PostMessage.findByIdAndUpdate(id, { likeCount: post.likeCount + 1 }, { new: true });
      return res.json(updatedPost);
    }

    // DELETE post
    if (req.method === 'DELETE' && id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).send(`No post with id: ${id}`);
      }
      await PostMessage.findByIdAndRemove(id);
      return res.json({ message: "Post deleted successfully." });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
}
