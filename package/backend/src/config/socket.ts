import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// Types pour les événements socket
export interface ServerToClientEvents {
	dataUpdate: (data: any) => void;
}

export interface ClientToServerEvents {
	subscribe: (channel: string) => void;
	unsubscribe: (channel: string) => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents>;

// Fonction pour initialiser Socket.IO
export const initializeSocketIO = (httpServer: HttpServer) => {
	io = new Server(httpServer, {
		cors: {
			// Accepter les connexions depuis n'importe quelle origine
			origin: "*",
			methods: ["GET", "POST"],
			credentials: true,
		},
	});

	io.on(
		"connection",
		(socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
			console.log(`Client connecté: ${socket.id}`);

			socket.on("subscribe", (channel) => {
				console.log(`Client ${socket.id} s'est abonné au canal: ${channel}`);
				socket.join(channel);
			});

			socket.on("unsubscribe", (channel) => {
				console.log(`Client ${socket.id} s'est désabonné du canal: ${channel}`);
				socket.leave(channel);
			});

			socket.on("disconnect", () => {
				console.log(`Client déconnecté: ${socket.id}`);
			});
		},
	);

	return io;
};

// Fonction pour émettre des données aux clients
export const emitToClients = (channel: string, data: any) => {
	if (!io) {
		console.warn("Socket.IO n'est pas initialisé");
		return;
	}
	console.log("🚀 ~ emitToClients ~ data:", data);
	io.to(channel).emit("dataUpdate", data ?? []);
};
