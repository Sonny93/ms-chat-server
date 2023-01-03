import { Server } from "socket.io";
import AdonisServer from "@ioc:Adonis/Core/Server";

class Ws {
	public io: Server;
	private booted = false;

	public boot() {
		/**
		 * Ignore multiple calls to the boot method
		 */
		if (this.booted) {
			return;
		}

		console.log("là socket");

		this.booted = true;
		this.io = new Server(AdonisServer.instance!, {
			cors: {
				origin: "*",
				methods: "*",
			},
		});
	}
}

export default new Ws();
