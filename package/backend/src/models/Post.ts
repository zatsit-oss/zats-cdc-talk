import { Entity, Column, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity()
export class Post {
	@PrimaryColumn()
	id!: string;

	@Column()
	authorName!: string;

	@Column()
	authorHandle!: string;

	@Column("text")
	content!: string;

	@CreateDateColumn()
	createdAt!: Date;
}
