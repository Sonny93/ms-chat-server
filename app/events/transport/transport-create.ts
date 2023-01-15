import Logger from "@ioc:Adonis/Core/Logger";
import { Router } from "mediasoup/node/lib/Router";

import User from "App/lib/User";

import { transportDataClient } from "App/utils/transport";
import { TRANSPORT_OPTIONS } from "Config/mediasoup";

type TransportCreateProps = {
	direction: "recv" | "send";
};
export default function (user: User, router: Router) {
	return async ({ direction }: TransportCreateProps, callback: Function) => {
		const transport = await router.createWebRtcTransport({
			...TRANSPORT_OPTIONS,
			appData: { userId: user.id },
		});

		transport.on("icestatechange", (connectionState) =>
			Logger.info(
				`${user.username} ice connection state: ${connectionState}`
			)
		);
		transport.on("dtlsstatechange", (connectionState) => {
			Logger.info(
				`${user.username} dtls connection state: ${connectionState}`
			);
			if (connectionState === "closed") {
				user.room?.removeTransport(transport.id);
			}
		});

		if (direction === "send") {
			user.setSendTransport(transport);
		} else if (direction === "recv") {
			user.setRecvTransport(transport);
		} else {
			return callback({ error: "Bad direction" });
		}

		user.room?.addTransport(transport);

		const transportData = await transportDataClient(transport);
		Logger.info(`${user.username} ${direction} transport created`);

		return callback({ transport: transportData });
	};
}
