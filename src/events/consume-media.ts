import { Router } from "mediasoup/node/lib/Router";
import { RtpCapabilities } from "mediasoup/node/lib/RtpParameters";
import { DefaultMethods, Signale } from "signale";
import { Socket } from "socket.io";

import User from "../lib/User";

type ConsumeMediaProps = {
    clientRtpCapabilities: RtpCapabilities;
    producerId: string;
};

export default function (
    router: Router,
    user: User,
    socketId: Socket["id"],
    transportLog: Signale<DefaultMethods>
) {
    return async (
        { clientRtpCapabilities, producerId }: ConsumeMediaProps,
        callback: any
    ) => {
        if (!clientRtpCapabilities) {
            return callback({
                error: "Missing client RTP capabilities",
            });
        } else if (!producerId) {
            return callback({ error: "Missing client producer id" });
        }

        if (
            !router.canConsume({
                producerId,
                rtpCapabilities: clientRtpCapabilities,
            })
        ) {
            transportLog.error(
                socketId,
                "cant consume this producerId",
                producerId
            );
            return callback({
                error: "Cant consume this producerId " + producerId,
            });
        }

        user.setClientRtpCapabilities(clientRtpCapabilities);

        const transport = user.getRecvTransport();
        if (!transport) {
            return callback({ error: "Unable to find transport" });
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities: clientRtpCapabilities,
        });
        transportLog.log(socketId, "consume success");

        return callback({
            consumerId: consumer.id,
            rtpParameters: consumer.rtpParameters,
        });
    };
}
