import express from "express";
import http from "http";
import { EachMessagePayload } from "kafkajs";
import dotenv from "dotenv";
import { Post } from "./models/Post";
import { initializeDatabase } from "./config/database";
import { initializeSocketIO } from "./config/socket";
import {
	initializeKafkaConsumer,
	initializeKafkaProducer,
	subscribeToTopic,
	shutdownKafka,
} from "./config/kafka";
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
		const consumer = await initializeKafkaConsumer("pokesky-group");

		// Configurer les écouteurs Kafka pour les actions du frontend
		await subscribeToTopic("post-creation", handleFrontendAction);

		// Configurer les routes API
		setupApiRoutes();

		// Démarrer le serveur HTTP
		server.listen(PORT, () => {
			console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
		});

		// Gestion de l'arrêt propre du serveur
		setupGracefulShutdown();
	} catch (error) {
		console.error("Erreur lors du démarrage du serveur:", error);
		process.exit(1);
	}
}

// Traitement des actions reçues du frontend via Kafka
async function handleFrontendAction(payload: EachMessagePayload) {
	try {
		const { topic, partition, message } = payload;
		if (!message.value) return;

		const action = JSON.parse(message.value.toString());
		console.log(`Action reçue: ${JSON.stringify(action)}`);
		console.log("Message reçu du topic 'post-creation'", payload);

		// Transformer les données pour correspondre à notre modèle de base de données
		const postData = {
			id: action.id,
			authorName: action.author.name,
			authorHandle: action.author.handle,
			content: action.content,
			createdAt: action.createdAt,
		};

		await dbActionService.create(Post, postData);

		// switch (action.type) {
		// 	case "CREATE_POST":
		// 		await dbActionService.create(Post, action.data);
		// 		break;
		// 	case "UPDATE_POST":
		// 		await dbActionService.update(Post, { id: action.data.id }, action.data);
		// 		break;
		// 	case "DELETE_POST":
		// 		await dbActionService.delete(Post, { id: action.data.id });
		// 		break;
		// 	default:
		// 		console.warn(`Type d'action inconnu: ${action.type}`);
		// }

		// Envoyer les données mises à jour au frontend
		const posts = await dbQueryService.findMany(Post);
		console.log("🚀 ~ handleFrontendAction ~ posts:", posts);
		dbQueryService.sendToFrontend("posts", posts);
	} catch (error) {
		console.error("Erreur lors du traitement de l'action Kafka:", error);
	}
}

// Configuration des routes API
function setupApiRoutes() {
	// Route pour obtenir tous les posts
	app.get("/api/posts", async (req, res) => {
		try {
			const posts = await dbQueryService.findMany(Post);
			res.json(posts);
		} catch (error) {
			res
				.status(500)
				.json({ error: "Erreur lors de la récupération des posts" });
		}
	});

	// Route pour obtenir un post par son ID
	app.get("/api/posts/:id", async (req, res) => {
		try {
			const post = await dbQueryService.findOne(Post, { id: req.params.id });
			if (!post) {
				return res.status(404).json({ error: "Post non trouvé" });
			}
			res.json(post);
		} catch (error) {
			res.status(500).json({ error: "Erreur lors de la récupération du post" });
		}
	});

	// Route pour vérifier la santé du service
	app.get("/health", (req, res) => {
		res.status(200).json({ status: "ok" });
	});
}

// Gestion de l'arrêt propre du serveur
function setupGracefulShutdown() {
	const shutdown = async () => {
		console.log("Arrêt du serveur...");

		// Fermer les connexions Kafka
		await shutdownKafka();

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
