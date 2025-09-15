import {
	Repository,
	EntityTarget,
	DeepPartial,
	FindOptionsWhere,
} from "typeorm";
import { AppDataSource } from "../config/database";
import { sendMessage } from "../config/kafka";
import { Post } from "../models/Post";

export class DatabaseActionService {
	async execute(data: any) {
		console.log("DatabaseActionService is running with data:", data);
		const postData = {
			id: data.id, // Utilisation de crypto.randomUUID() en remplacement de uuid v4
			authorName: data.author.name,
			authorHandle: data.author.handle,
			content: data.content,
			createdAt: data.createdAt,
		};

		const post = await this.create(Post, postData);
		console.log("Created post:", post);
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

		// Envoyer une notification Kafka
		const entityName = this.getEntityName(entity);
		await sendMessage(`${entityName.toLowerCase()}.created`, {
			type: "CREATE",
			entity: entityName,
			data: savedEntity,
		});

		return savedEntity;
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
