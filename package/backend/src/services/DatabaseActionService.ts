import { Repository, EntityTarget, DeepPartial } from "typeorm";
import { AppDataSource } from "../config/database";
import { initializeKafkaConsumer, subscribeToTopic } from "../config/kafka";
import { Post } from "../models/Post";
import { EachMessagePayload } from "kafkajs";

export class DatabaseActionService {
	async consume(payload: EachMessagePayload) {
		try {
			const { message } = payload;
			if (!message.value) return;

			const action = JSON.parse(message.value.toString());

			console.log(`🐘 [CreationService] Message reçu du topic Kafka:`, action);

			this.execute(action);
		} catch (error) {
			console.error("Erreur lors du traitement de l'action Kafka:", error);
		}
	}

	async initialize() {
		const consumer = await initializeKafkaConsumer("pokesky-action-group");
		await subscribeToTopic(consumer, "post-creation", this.consume.bind(this));
		return consumer;
	}

	async execute(data: any) {
		const postData = {
			id: data.id, // Utilisation de crypto.randomUUID() en remplacement de uuid v4
			authorName: data.author.name,
			authorHandle: data.author.handle,
			content: data.content,
			createdAt: data.createdAt,
		};

		const post = await this.create(Post, postData);
		console.log("✅ Post créé:", post);
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
	 * Créer une nouvelle entité en base de données
	 * @param entity Entité TypeORM
	 * @param data Données à insérer
	 * @returns Entité créée
	 */
	async create<T>(entity: EntityTarget<T>, data: DeepPartial<T>): Promise<T> {
		const repository = this.getRepository(entity);
		const newEntity = repository.create(data);
		const savedEntity = await repository.save(newEntity as any);

		return savedEntity;
	}
}
