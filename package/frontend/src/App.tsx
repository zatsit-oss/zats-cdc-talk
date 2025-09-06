import React, { useEffect, useState } from "react";
import Feed from "./pages/Feed";
import { socketService } from "./lib/socketService";

export default function App() {
	const [receivedPosts, setReceivedPosts] = useState<any[]>([]);

	useEffect(() => {
		// Connecter au serveur Socket.IO
		socketService.connect();

		// S'abonner au canal 'posts'
		const handlePostsUpdate = (data: any) => {
			console.log("Posts reçus du backend via Socket.IO:", data);
			setReceivedPosts(data);
		};

		socketService.addListener("posts", handlePostsUpdate);

		// Nettoyage lors du démontage du composant
		return () => {
			socketService.removeListener("posts", handlePostsUpdate);
			socketService.disconnect();
		};
	}, []);

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="max-w-4xl mx-auto p-6">
				<header className="mb-6">
					<h1 className="text-2xl font-bold">Le CDC pour ne pas DCD.</h1>
					<p className="text-sm text-slate-500">Pokésky.</p>
				</header>

				<Feed />

				{receivedPosts.length > 0 && (
					<div className="mt-8 p-4 bg-white rounded-lg shadow">
						<h2 className="text-xl font-semibold mb-4">
							Posts reçus du backend (via Socket.IO)
						</h2>
						<pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
							{JSON.stringify(receivedPosts, null, 2)}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}
