import {
	Repository,
	EntityTarget,
	FindOptionsWhere,
	FindManyOptions,
} from "typeorm";
import { AppDataSource } from "../config/database";
import { emitToClients } from "../config/socket";
import { Post } from "../models/Post";
import { EachMessagePayload } from "kafkajs";
import { initializeKafkaConsumer, subscribeToTopic } from "../config/kafka";

export class DatabaseQueryService {


	async consume(payload: EachMessagePayload) {
		try {
			const { message } = payload;
			if (!message.value) return;

			const action = JSON.parse(message.value.toString());
			console.log(`Action reçue: ${JSON.stringify(action)}`);
			console.log("Message reçu du topic 'post-creation'", payload);
			const n = Math.random();

			if (n < 0.3) {
				setTimeout(() => {
					this.execute(action.id);
				}, 500);
			} else {
				this.execute(action.id);
			}


		} catch (error) {
			console.error("Erreur lors du traitement de l'action Kafka:", error);
		}
	}

	async initialize() {
		const consumer = await initializeKafkaConsumer("pokesky-query-group");
		await subscribeToTopic(consumer, "post-creation", this.consume.bind(this));
		return consumer;
	}

	async execute(id: string) {
		console.log("Attempt to query post with id:", id);
		try {
			const post = await this.findOne(Post, { id });
			if (!post) {
				this.sendToFrontend("posts", { message: `Cannot find post with id ${id}` });
				return;
			}
			console.log("🚀 Post found:", post);
			this.sendToFrontend("posts", post);
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Obtenir le repository pour une entité donnée
	 * @param entity Entité TypeORM
	 * @returns Repository pour l'entité
	 */
	private getRepository<T>(entity: EntityTarget<T>): Repository<T> {
		return AppDataSource.getRepository(entity);
	}

	/**
	 * Obtenir une entité par ses critères
	 * @param entity Entité TypeORM
	 * @param criteria Critères de recherche
	 * @returns Entité trouvée ou null
	 */
	async findOne<T>(
		entity: EntityTarget<T>,
		criteria: FindOptionsWhere<T>,
	): Promise<T | null> {
		const repository = this.getRepository(entity);
		return repository.findOne({ where: criteria });
	}

	/**
	 * Obtenir plusieurs entités selon des critères
	 * @param entity Entité TypeORM
	 * @param options Options de recherche
	 * @returns Liste d'entités trouvées
	 */
	async findMany<T>(
		entity: EntityTarget<T>,
		options?: FindManyOptions<T>,
	): Promise<T[]> {
		const repository = this.getRepository(entity);
		return repository.find(options || {});
	}

	/**
	 * Compter le nombre d'entités selon des critères
	 * @param entity Entité TypeORM
	 * @param options Options de comptage
	 * @returns Nombre d'entités
	 */
	async count<T>(
		entity: EntityTarget<T>,
		criteria?: FindOptionsWhere<T>,
	): Promise<number> {
		const repository = this.getRepository(entity);
		return repository.count({ where: criteria });
	}

	/**
	 * Envoyer les données au frontend via Socket.IO
	 * @param channel Canal Socket.IO
	 * @param data Données à envoyer
	 */
	sendToFrontend(channel: string, data: any): void {
		emitToClients(channel, data);
	}

	/**
	 * Récupère les données et les envoie immédiatement au frontend
	 * @param entity Entité TypeORM
	 * @param channel Canal Socket.IO
	 * @param options Options de recherche
	 */
	async findAndSendToFrontend<T>(
		entity: EntityTarget<T>,
		channel: string,
		options?: FindManyOptions<T>,
	): Promise<T[]> {
		const data = await this.findMany(entity, options);
		this.sendToFrontend(channel, data);
		return data;
	}

	/**
	 * Récupère une entité et l'envoie immédiatement au frontend
	 * @param entity Entité TypeORM
	 * @param channel Canal Socket.IO
	 * @param criteria Critères de recherche
	 */
	async findOneAndSendToFrontend<T>(
		entity: EntityTarget<T>,
		channel: string,
		criteria: FindOptionsWhere<T>,
	): Promise<T | null> {
		const data = await this.findOne(entity, criteria);
		if (data) {
			this.sendToFrontend(channel, data);
		}
		return data;
	}

	/**
	 * Configure un écouteur Kafka pour envoyer automatiquement les mises à jour au frontend
	 * @param entity Entité TypeORM
	 * @param eventTypes Types d'événements à écouter
	 * @param channel Canal Socket.IO
	 */
	async setupAutoSync<T>(
		entity: EntityTarget<T>,
		eventTypes: ("created" | "updated" | "deleted")[],
		channel: string,
	): Promise<void> {
		// Cette méthode pourrait être implémentée pour configurer des écouteurs Kafka
		// qui envoient automatiquement les mises à jour au frontend via Socket.IO
		// Ici, nous simulerions la réponse à des événements Kafka
		console.log(
			`Configuration de l'auto-synchronisation pour ${this.getEntityName(entity)} sur le canal ${channel}`,
		);
	}

	/**
	 * Extrait le nom de l'entité à partir de l'objet entité
	 * @param entity Entité TypeORM
	 * @returns Nom de l'entité
	 */
	private getEntityName<T>(entity: EntityTarget<T>): string {
		if (typeof entity === "function") {
			return entity.name;
		}
		if (typeof entity === "string") {
			return entity;
		}
		return "Unknown";
	}
}
