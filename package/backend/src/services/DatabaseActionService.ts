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
		console.log("created post", post);
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
	 * Mettre à jour une entité en base de données
	 * @param entity Entité TypeORM
	 * @param id Identifiant de l'entité
	 * @param data Données à mettre à jour
	 * @returns Entité mise à jour
	 */
	async update<T>(
		entity: EntityTarget<T>,
		criteria: FindOptionsWhere<T>,
		data: DeepPartial<T>,
	): Promise<T | null> {
		const repository = this.getRepository(entity);

		// Vérifier si l'entité existe
		const existingEntity = await repository.findOne({ where: criteria });
		if (!existingEntity) {
			return null;
		}

		// Mettre à jour l'entité
		const updateResult = await repository.update(criteria, data as any);
		if (updateResult.affected === 0) {
			return null;
		}

		// Récupérer l'entité mise à jour
		const updatedEntity = await repository.findOne({ where: criteria });

		// Envoyer une notification Kafka
		const entityName = this.getEntityName(entity);
		await sendMessage(`${entityName.toLowerCase()}.updated`, {
			type: "UPDATE",
			entity: entityName,
			data: updatedEntity,
		});

		return updatedEntity;
	}

	/**
	 * Supprimer une entité de la base de données
	 * @param entity Entité TypeORM
	 * @param id Identifiant de l'entité
	 * @returns Résultat de la suppression
	 */
	async delete<T>(
		entity: EntityTarget<T>,
		criteria: FindOptionsWhere<T>,
	): Promise<boolean> {
		const repository = this.getRepository(entity);

		// Récupérer l'entité avant suppression pour Kafka
		const entityToDelete = await repository.findOne({ where: criteria });
		if (!entityToDelete) {
			return false;
		}

		// Supprimer l'entité
		const deleteResult = await repository.delete(criteria);
		const success =
			deleteResult.affected !== undefined && deleteResult.affected > 0;

		if (success) {
			// Envoyer une notification Kafka
			const entityName = this.getEntityName(entity);
			await sendMessage(`${entityName.toLowerCase()}.deleted`, {
				type: "DELETE",
				entity: entityName,
				data: entityToDelete,
			});
		}

		return success;
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
