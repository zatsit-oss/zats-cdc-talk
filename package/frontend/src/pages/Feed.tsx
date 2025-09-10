import React, { useState } from "react";
import Post from "../post/Post";
import CreatePost from "../components/CreatePost";
import { posts as initialPosts } from "../data/posts";
import { getRandomPokemon, pokemonPostPhrases } from "../lib/pokemon";

export const Feed: React.FC = () => {
	const [posts, setPosts] = useState(initialPosts);

	const handleCreatePost = (
		content: string,
		selectedPokemon: { name: string; handle: string; avatar: string },
	) => {
		const newPost = {
			id: (posts.length + 1).toString(),
			author: {
				name: selectedPokemon.name,
				handle: selectedPokemon.handle,
				avatar: selectedPokemon.avatar,
			},
			content,
			createdAt: new Date().toISOString(),
			likeCount: 0,
			replyCount: 0,
			repostCount: 0,
		};

		setPosts([newPost, ...posts]);
	};

	return (
		<main className="max-w-2xl mx-auto py-8 space-y-4">
			<header className="mb-4">
				<h2 className="text-2xl font-bold">Fil d'actualité</h2>
				<p className="text-sm text-slate-500">
					À la mode Bluesky — posts récents
				</p>
			</header>

			<CreatePost onCreate={handleCreatePost} />

			{/* <section className="flex flex-col gap-3">
        {posts.map((p) => (
          <Post key={p.id} post={p} />
        ))}
      </section> */}
		</main>
	);
};

export default Feed;
