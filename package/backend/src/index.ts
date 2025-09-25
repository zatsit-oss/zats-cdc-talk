import express from "express";
import http from "http";
import type { Consumer } from "kafkajs";
import dotenv from "dotenv";
import { initializeDatabase } from "./config/database";
import { initializeSocketIO } from "./config/socket";
import { initializeKafkaProducer, shutdownKafka } from "./config/kafka";
import { DatabaseActionService } from "./services/DatabaseActionService";
import { DatabaseQueryService } from "./services/DatabaseQueryService";

// Chargement des variables d'environnement
dotenv.config();

// Services
const dbActionService = new DatabaseActionService();
const dbQueryService = new DatabaseQueryService();

// Initialisation de l'application Express
const app = express();
app.use(express.json());
const server = http.createServer(app);

// Port d'écoute
const PORT = process.env.PORT || 3000;

// Fonction de démarrage du serveur
async function startServer() {
	try {
		// Initialiser la connexion à la base de données
		await initializeDatabase();

		// Initialiser Socket.IO
		const io = initializeSocketIO(server);

		// Initialiser Kafka
		await initializeKafkaProducer();

		const actionConsumer = await dbActionService.initialize();
		const queryConsumer = await dbQueryService.initialize();

		// Démarrer le serveur HTTP
		server.listen(PORT, () => {
			console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
		});

		// Gestion de l'arrêt propre du serveur
		setupGracefulShutdown([actionConsumer, queryConsumer]);
	} catch (error) {
		console.error("Erreur lors du démarrage du serveur:", error);
		process.exit(1);
	}
}

// Gestion de l'arrêt propre du serveur
function setupGracefulShutdown(consumers: Consumer[] = []) {
	const shutdown = async () => {
		console.log("Arrêt du serveur...");

		// Fermer les connexions Kafka
		await shutdownKafka(consumers);

		// Fermer le serveur HTTP
		server.close(() => {
			console.log("Serveur HTTP arrêté");
			process.exit(0);
		});
	};

	// Capturer les signaux d'arrêt
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

// Démarrer le serveur
startServer().catch(console.error);
