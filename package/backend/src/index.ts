import express from "express";
import http from "http";
import type { Consumer } from "kafkajs";
import dotenv from "dotenv";
import { initializeDatabase } from "./config/database";
import { initializeSocketIO } from "./config/socket";
import { initializeKafkaProducer, shutdownKafka, sendMessage } from "./config/kafka";
import { DatabaseActionService } from "./services/DatabaseActionService";
import { DatabaseQueryService } from "./services/DatabaseQueryService";

// Chargement des variables d'environnement
dotenv.config();

const mode: "DCD" | "CDC" =
	process.env.MODE === "DCD"
		? "DCD"
		: process.env.MODE === "CDC"
			? "CDC"
			: "DCD";

type ServiceType = "action" | "query" | "both";
const serviceType: ServiceType = (process.env.SERVICE_TYPE as ServiceType) || "both";

// ASCII Art pour afficher le mode
console.log("+-----------------------------------------+");
if (mode === "CDC") {
	console.log("|   .d8888b.  8888888b.   .d8888b.      |");
	console.log('|  d88P  Y88b 888  "Y88b d88P  Y88b     |');
	console.log("|  888    888 888    888 888            |");
	console.log("|  888        888    888 888            |");
	console.log("|  888        888    888 888            |");
	console.log("|  Y88b    d8 888  .d88P Y88b    d8     |");
	console.log('|   "Y8888P"  8888888P"   "Y8888P"      |');
} else {
	console.log("|  8888888b.   .d8888b.  8888888b.      |");
	console.log('|  888  "Y88b d88P  Y88b 888  "Y88b     |');
	console.log("|  888    888 888    888 888    888     |");
	console.log("|  888    888 888        888    888     |");
	console.log("|  888    888 888        888    888     |");
	console.log("|  888  .d88P Y88b  d88P 888  .d88P     |");
	console.log('|  8888888P"   "Y8888P"  8888888P"      |');
}
console.log("+-----------------------------------------+");
console.log(`|  Service Type: ${serviceType.toUpperCase().padEnd(28)} |`);
console.log("+-----------------------------------------+");

// Services
const dbActionService = new DatabaseActionService();
const dbQueryService = new DatabaseQueryService(mode);

// Initialisation de l'application Express
const app = express();
app.use(express.json());
const server = http.createServer(app);

// Health check endpoint pour Kubernetes
app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok", mode, serviceType });
});

// Port d'écoute
const PORT = process.env.PORT || 3000;

// Fonction de démarrage du serveur
async function startServer() {
	try {
		// Initialiser la connexion à la base de données
		await initializeDatabase();

		// Variables pour stocker les consumers
		const consumers: Consumer[] = [];

		// Initialiser Socket.IO seulement si le service query est actif
		if (serviceType === "query" || serviceType === "both") {
			const io = initializeSocketIO(server);
			console.log("✅ Socket.IO initialisé");
		}

		// Initialiser Kafka
		await initializeKafkaProducer();

		// Initialiser les services selon SERVICE_TYPE
		if (serviceType === "action" || serviceType === "both") {
			const actionConsumer = await dbActionService.initialize();
			consumers.push(actionConsumer);
			console.log("✅ DatabaseActionService initialisé");
		}

		if (serviceType === "query" || serviceType === "both") {
			const queryConsumer = await dbQueryService.initialize();
			consumers.push(queryConsumer);
			console.log("✅ DatabaseQueryService initialisé");
		}

		// Démarrer le serveur HTTP
		server.listen(PORT, () => {
			console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
			console.log(`📡 Mode: ${mode}`);
			console.log(`🔧 Service: ${serviceType}`);
		});

		// Gestion de l'arrêt propre du serveur
		setupGracefulShutdown(consumers);
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
