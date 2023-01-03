import Logger from "@ioc:Adonis/Core/Logger";
import { Router } from "mediasoup/node/lib/Router";
import { Socket } from "socket.io";

import User from "App/lib/User";

import { transportDataClient } from "App/utils/transport";
import { TRANSPORT_OPTIONS } from "Config/mediasoup";

type TransportCreateProps = {
	direction: "recv" | "send";
};
export default function (user: User, router: Router, socketId: Socket["id"]) {
	return async ({ direction }: TransportCreateProps, callback: Function) => {
		const transport = await router.createWebRtcTransport({
			...TRANSPORT_OPTIONS,
			appData: { userId: user.id },
		});

		transport.on("icestatechange", (connectionState) =>
			Logger.info("icestatechange", connectionState)
		);
		transport.on("dtlsstatechange", (connectionState) => {
			Logger.info("dtlsstatechange", connectionState);
			if (connectionState === "closed") {
				Logger.info("closed");
			}
		});

		if (direction === "send") {
			user.setSendTransport(transport);
		} else if (direction === "recv") {
			user.setRecvTransport(transport);
		} else {
			return callback({ error: "Bad direction" });
		}

		const transportData = await transportDataClient(transport);
		Logger.info(socketId, `${direction} transport created`);

		return callback({ transport: transportData });
	};
}
