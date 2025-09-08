import axios from 'axios';
import {Post} from "../data/posts";

const KAFKA_TOPIC = 'post-creation';
const KAFKA_REST_PROXY_URL = 'http://localhost:8082';

/**
 * Publishes a post creation event to the Kafka topic via REST Proxy.
 * @param {Object} post - The post data to publish.
 * @param {string} post.id - The ID of the post.
 * @param {Object} post.author - The author of the post.
 * @param {string} post.author.name - The name of the author.
 * @param {string} post.author.handle - The handle of the author.
 * @param {string} post.content - The content of the post.
 * @param {string} post.createdAt - The creation timestamp of the post.
 * @returns {Promise<void>} - A promise that resolves when the event is published.
 */
export async function publishPostCreationEvent(post: Post) {
  try {
    const payload = {
      records: [
        {
          key: post.id,
          value: post,
        },
      ],
    };

    await axios.post(`${KAFKA_REST_PROXY_URL}/topics/${KAFKA_TOPIC}`, payload, {
      headers: {
        'Content-Type': 'application/vnd.kafka.json.v2+json',
      },
    });

    console.log(`Post creation event published to topic ${KAFKA_TOPIC}`);
  } catch (error) {
    console.error('Failed to publish post creation event:', error);
    throw error;
  }
}
