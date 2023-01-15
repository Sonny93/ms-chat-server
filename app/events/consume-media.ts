import Logger from "@ioc:Adonis/Core/Logger";
import { Router } from "mediasoup/node/lib/Router";
import { RtpCapabilities } from "mediasoup/node/lib/RtpParameters";

import User from "App/lib/User";

type ConsumeMediaProps = {
	clientRtpCapabilities: RtpCapabilities;
	producerId: string;
};

export default function (router: Router, user: User) {
	return async (
		{ clientRtpCapabilities, producerId }: ConsumeMediaProps,
		callback: any
	) => {
		if (!clientRtpCapabilities) {
			Logger.error(`${user.username} missing RTP Parameters`);
			return callback({
				error: "Missing client RTP capabilities",
			});
		} else if (!producerId) {
			Logger.error(`${user.username} missing client producer id`);
			return callback({ error: "Missing client producer id" });
		}

		if (
			!router.canConsume({
				producerId,
				rtpCapabilities: clientRtpCapabilities,
			})
		) {
			Logger.error(
				`${user.username} cant consume this producerId: ${producerId}`
			);
			return callback({
				error: "Cant consume this producerId " + producerId,
			});
		}

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getRecvTransport();
		if (!transport) {
			Logger.error(`${user.username} unable to find transport`);
			return callback({ error: "Unable to find transport" });
		}

		const consumer = await transport.consume({
			producerId,
			rtpCapabilities: clientRtpCapabilities,
		});
		Logger.info(`${user.username} consume success`);

		return callback({
			consumerId: consumer.id,
			rtpParameters: consumer.rtpParameters,
		});
	};
}
