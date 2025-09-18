/// <reference types="vite/client" />
import { io, Socket } from "socket.io-client";

// Interface pour reproduire la structure minimale de ImportMetaEnv
interface MinimalEnv {
	VITE_SOCKET_URL?: string;
}

class SocketService {
	private socket: Socket | null = null;
	private readonly url: string;

	constructor() {
		// Vérifier si import.meta.env existe avant d'essayer d'y accéder
		const env: MinimalEnv =
			typeof import.meta !== "undefined" ? import.meta.env : {};
		this.url = env.VITE_SOCKET_URL || "http://localhost:3000";
		console.log("this.url", this.url);
	}

	connect(): void {
		if (!this.socket) {
			this.socket = io(this.url);
			console.log("Connexion Socket.IO établie avec:", this.url);

			this.socket.on("connect", () => {
				console.log("Socket.IO connecté avec l'ID:", this.socket?.id);
			});

			this.socket.on("connect_error", (error) => {
				console.error("Erreur de connexion Socket.IO:", error);
			});

			this.socket.on("disconnect", (reason) => {
				console.log("Socket.IO déconnecté:", reason);
			});
		}
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
			console.log("Socket.IO déconnecté");
		}
	}

	emit(event: string, data: any): void {
		console.log("hey");
		if (this.socket) {
			this.socket.emit(event, data);
		} else {
			console.warn("Tentative d'émission sur un socket non connecté");
		}
	}

	addListener(event: string, callback: (data: any) => void): void {
		if (this.socket) {
			this.socket.on(event, callback);
		} else {
			console.warn(
				"Tentative d'ajout d'un écouteur sur un socket non connecté",
			);
		}
	}

	removeListener(event: string, callback: (data: any) => void): void {
		if (this.socket) {
			this.socket.off(event, callback);
		}
	}
}

export const socketService = new SocketService();
