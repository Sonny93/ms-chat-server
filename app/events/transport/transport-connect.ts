import Logger from "@ioc:Adonis/Core/Logger";
import { DtlsParameters } from "mediasoup/node/lib/WebRtcTransport";

import User from "App/lib/User";

type TransportConnectProps = {
	direction: "recv" | "send";
	dtlsParameters: DtlsParameters;
};
export default function (user: User) {
	return async (
		{ direction, dtlsParameters }: TransportConnectProps,
		callback: Function
	) => {
		if (!dtlsParameters) {
			return callback({ error: "Missing DTLS parameters" });
		}

		const transport =
			direction === "send"
				? user.getSendTransport()
				: user.getRecvTransport();

		if (!transport) {
			return callback({
				error: "Unable to connect to transport",
			});
		}

		await transport.connect({ dtlsParameters });
		Logger.info(`${user.username} connected to ${direction} transport`);

		return callback({});
	};
}
