import { Router } from "mediasoup/node/lib/Router";
import { DefaultMethods, Signale } from "signale";
import { Socket } from "socket.io";

import User from "../../lib/User";

import { TRANSPORT_OPTIONS } from "../../config.js";
import { transportDataClient } from "../../utils/transport.js";

type TransportCreateProps = {
    direction: "recv" | "send";
};
export default function (
    user: User,
    router: Router,
    socketId: Socket["id"],
    transportLog: Signale<DefaultMethods>
) {
    return async ({ direction }: TransportCreateProps, callback: Function) => {
        const transport = await router.createWebRtcTransport({
            ...TRANSPORT_OPTIONS,
            appData: { userId: user.id },
        });

        transport.on("icestatechange", (connectionState) =>
            transportLog.log("icestatechange", connectionState)
        );
        transport.on("dtlsstatechange", (connectionState) => {
            transportLog.log("dtlsstatechange", connectionState);
            if (connectionState === "closed") {
                transportLog.log("closed");
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
        transportLog.log(socketId, `${direction} transport created`);

        return callback({ transport: transportData });
    };
}
