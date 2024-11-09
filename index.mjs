import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Define __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, './public')));

// Route to fetch Instagram posts (your existing code here)
app.get('/get-instagram-posts', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink,media_type&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
    const data = await response.json();
    res.json(data.data.slice(0, 3));
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    res.status(500).json({ error: 'Failed to fetch Instagram posts' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
