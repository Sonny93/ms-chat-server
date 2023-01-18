import Logger from "@ioc:Adonis/Core/Logger";
import {
	MediaKind,
	RtpCapabilities,
	RtpParameters,
} from "mediasoup/node/lib/RtpParameters";
import { Socket } from "socket.io";

import User from "App/lib/User";

type ProduceMediaProps = {
	rtpParameters: RtpParameters;
	clientRtpCapabilities: RtpCapabilities;
	kind: MediaKind;
};

export default function (user: User, socket: Socket) {
	return async (
		{ rtpParameters, clientRtpCapabilities, kind }: ProduceMediaProps,
		callback: any
	) => {
		if (!rtpParameters) {
			Logger.error(`${user.username} missing RTP Parameters`);
			return callback({ error: "Missing RTP parameters" });
		} else if (!clientRtpCapabilities) {
			Logger.error(`${user.username} missing client RTP capabilities`);
			return callback({
				error: "Missing client RTP capabilities",
			});
		} else if (!kind) {
			Logger.error(`${user.username} missing media kind`);
			return callback({ error: "Missing media Kind" });
		}

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getSendTransport();
		if (!transport) {
			Logger.error(`${user.username} uunable to find transport`);
			return callback({ error: "Unable to find transport" });
		}

		const producer = await transport.produce({
			kind,
			rtpParameters,
			appData: {
				userId: user.id,
			},
		});
		Logger.info(`${user.username} produce success`);

		user.room?.addProducer(producer);
		producer.on("@close", () => {
			user.room?.removeProducer(producer.id);
			console.log("producer close");
		});

		if (user.room?.id) {
			Logger.debug(`${user.username} produce to ${user.room.id}`);
			socket.to(user.room.id).emit("call-produce", {
				userId: user.id,
				producerId: producer.id,
			});
		} else {
			Logger.debug(
				`${user.username} unable to find room to produce, close tansport`
			);
			transport.close();
		}

		return callback({ produceId: producer.id });
	};
}
