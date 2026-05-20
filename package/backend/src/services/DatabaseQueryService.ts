import type { Repository, EntityTarget, FindOptionsWhere, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../config/database";
import { emitToClients } from "../config/socket";
import { Post } from "../models/Post";
import type { EachMessagePayload } from "kafkajs";
import { initializeKafkaConsumer, subscribeToTopic } from "../config/kafka";
import { mimicNetworkLatency } from "../utils";

export class DatabaseQueryService {
	readonly mode: "CDC" | "DCD";
	readonly topic: string;

	constructor(mode: "CDC" | "DCD") {
		this.mode = mode;
		this.topic = "post-creation";
	}

	async consume(payload: EachMessagePayload) {
		try {
			const { message } = payload;
			if (!message.value) return;

			const action = JSON.parse(message.value.toString());
			console.log(
				`[📢 BroadcastService] Message reçu du topic Kafka ${this.topic}:`,
				action,
			);

			const id = action.id;
			this.execute(id);
			// mimicNetworkLatency(() => this.execute(id));
		} catch (error) {
			console.error("Erreur lors du traitement de l'action Kafka:", error);
		}
	}

	async initialize() {
		const consumer = await initializeKafkaConsumer("pokesky-query-group");
		await subscribeToTopic(consumer, this.topic, this.consume.bind(this));
		return consumer;
	}

	async execute(id: string) {
		console.log("[📢 BroadcastService] 🧐 Attempt to get post with id:", id);
		try {
			const post = await this.findOne(Post, { id });
			if (!post) {
				this.sendToFrontend("posts", {
					message: `Cannot find post with id ${id}`,
				});
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
	private getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
		return AppDataSource.getRepository(entity);
	}

	/**
	 * Obtenir une entité par ses critères
	 * @param entity Entité TypeORM
	 * @param criteria Critères de recherche
	 * @returns Entité trouvée ou null
	 */
	async findOne<T extends ObjectLiteral>(
		entity: EntityTarget<T>,
		criteria: FindOptionsWhere<T>,
	): Promise<T | null> {
		const repository = this.getRepository(entity);
		return repository.findOne({ where: criteria });
	}

	/**
	 * Envoyer les données au frontend via Socket.IO
	 * @param channel Canal Socket.IO
	 * @param data Données à envoyer
	 */
	sendToFrontend(channel: string, data: any): void {
		emitToClients(channel, data);
	}
}
