import { Kafka, Consumer, Producer, EachMessagePayload } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

// Configuration de Kafka
const kafka = new Kafka({
  clientId: "zats-cdc-backend",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

let producer: Producer;
// let consumer: Consumer;

// Initialisation du producteur Kafka
export const initializeKafkaProducer = async () => {
  producer = kafka.producer();
  try {
    await producer.connect();
    console.log("✅ Producteur Kafka connecté");
    return producer;
  } catch (error) {
    console.error("❌ Erreur lors de la connexion du producteur Kafka:", error);
    throw error;
  }
};

// Initialisation du consommateur Kafka
export const initializeKafkaConsumer = async (groupId: string) => {
  const consumer = kafka.consumer({ groupId });
  try {
    await consumer.connect();
    console.log(`✅ Consommateur Kafka (groupe ${groupId}) connecté`);
    return consumer;
  } catch (error) {
    console.error(`❌ Erreur lors de la connexion du consommateur Kafka (groupe ${groupId}):`, error);
    throw error;
  }
};

// Abonnement à un topic
export const subscribeToTopic = async (consumer: Consumer, topic: string, messageHandler: (payload: EachMessagePayload) => Promise<void>) => {
  if (!consumer) {
    throw new Error("Le consommateur Kafka n'est pas initialisé");
  }

  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: messageHandler,
  });

  console.log(`✅ Abonnement au topic Kafka '${topic}' réussi`);
};

// Envoi de message à un topic
export const sendMessage = async (topic: string, message: any, key?: string) => {
  if (!producer) {
    throw new Error("Le producteur Kafka n'est pas initialisé");
  }

  await producer.send({
    topic,
    messages: [
      {
        key: key || undefined,
        value: typeof message === "string" ? message : JSON.stringify(message),
      },
    ],
  });
};

// Fermeture des connexions
export const shutdownKafka = async (consumers: Consumer[]) => {
  if (producer) {
    await producer.disconnect();
    console.log("Producteur Kafka déconnecté");
  }

  for (const consumer of consumers) {
    await consumer.disconnect();
    console.log("Consommateur Kafka déconnecté");
  }
};