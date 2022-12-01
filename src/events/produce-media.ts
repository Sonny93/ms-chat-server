import {
    MediaKind,
    RtpCapabilities,
    RtpParameters,
} from "mediasoup/node/lib/RtpParameters";
import { DefaultMethods, Signale } from "signale";
import { Socket } from "socket.io";

import User from "../lib/User";

type ProduceMediaProps = {
    rtpParameters: RtpParameters;
    clientRtpCapabilities: RtpCapabilities;
    kind: MediaKind;
};

export default function (
    user: User,
    socket: Socket,
    socketLog: Signale<DefaultMethods>
) {
    return async (
        { rtpParameters, clientRtpCapabilities, kind }: ProduceMediaProps,
        callback: any
    ) => {
        if (!rtpParameters) {
            return callback({ error: "Missing RTP parameters" });
        } else if (!clientRtpCapabilities) {
            return callback({
                error: "Missing client RTP capabilities",
            });
        } else if (!kind) {
            return callback({ error: "Missing media Kind" });
        }

        user.setClientRtpCapabilities(clientRtpCapabilities);

        const transport = user.getSendTransport();
        if (!transport) {
            return callback({ error: "Unable to find transport" });
        }

        const producer = await transport.produce({
            kind,
            rtpParameters,
        });
        socketLog.log(socket.id, "produce success");

        socket.to(user.room!.id).emit("call-produce", {
            userId: user.id,
            producerId: producer.id,
        });

        return callback({ produceId: producer.id });
    };
}
