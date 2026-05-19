import axios from 'axios';
import {Post} from "../data/posts";

// En production, utiliser le proxy nginx (/api)
// En dev, utiliser le backend directement
const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
const API_URL = isProduction ? '/api' : 'http://localhost:3000/api';

/**
 * Publishes a post creation event to Kafka via the backend API.
 * @param {Object} post - The post data to publish.
 * @returns {Promise<void>} - A promise that resolves when the event is published.
 */
export async function publishPostCreationEvent(post: Post) {
  try {
    await axios.post(`${API_URL}/posts`, post, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Post creation event published via backend API`);
  } catch (error) {
    console.error('Failed to publish post creation event:', error);
    throw error;
  }
}
