import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Configuration de la connexion à la base de données PostgreSQL
export const AppDataSource = new DataSource({
	type: "postgres",
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT || "5433"),
	username: process.env.DB_USER || "pikachu",
	password: process.env.DB_PASSWORD || "zatsit",
	database: process.env.DB_NAME || "pokesky",
	synchronize: process.env.NODE_ENV !== "production", // Synchronisation automatique du schéma en développement
	logging: process.env.NODE_ENV !== "production",
	entities: [path.join(__dirname, "../models/**/*.{js,ts}")],
	migrations: [path.join(__dirname, "../migrations/**/*.{js,ts}")],
});

// Fonction pour initialiser la connexion à la base de données
export const initializeDatabase = async () => {
	try {
		await AppDataSource.initialize();
		console.log("✅ Connexion à la base de données PostgreSQL établie");
		return AppDataSource;
	} catch (error) {
		console.error(
			"❌ Erreur lors de la connexion à la base de données:",
			error,
		);
		throw error;
	}
};
