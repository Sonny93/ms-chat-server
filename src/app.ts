import { createWorker, observer } from "mediasoup";
import {
    DtlsParameters,
    MediaKind,
    Router,
    RtpCapabilities,
    RtpParameters,
    Worker,
} from "mediasoup/node/lib/types";

import signale from "signale";

import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

// Classes
import Room from "./lib/Room.js";
import User from "./lib/User.js";

// Utils
import { mapToArray } from "./utils/index.js";
import { transportDataClient } from "./utils/transport.js";

// Config
import {
    HOST_IP,
    HOST_PORT,
    MEDIA_CODECS,
    TRANSPORT_OPTIONS,
    WORKER_OPTIONS,
} from "./config.js";

const USERS = new Map<string, User>();

const ROOMS = new Map<string, Room>();
[...new Array(5)].map(() => {
    const defaultRoom = new Room();
    ROOMS.set(defaultRoom.id, defaultRoom);
});

const worker = await createWorker(WORKER_OPTIONS);
const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: "*",
    },
});

const socketLog = new signale.Signale({ scope: "Socket" });
const transportLog = new signale.Signale({ scope: "Transport" });
httpServer.listen(HOST_PORT, HOST_IP, () =>
    socketLog.log(`Server started as ${HOST_IP}:${HOST_PORT}`)
);

import { SERVER_EVENTS } from "./events/events.js";

import JoinRoomEvent from "./events/join-room.js";
import LeaveRoomEvent from "./events/leave-room.js";
import MessageEvent from "./events/message.js";
import RouterRtpCapabilitiesEvent from "./events/router-rtp-capabilities.js";

import { leaveRoom } from "./utils/room.js";

type SocketProps = Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    { user: User }
>;

io.on(SERVER_EVENTS.SOCKET_CONNECTION, async (socket: SocketProps) => {
    try {
        const [username, avatar] = await getUsernameAndAvatarFromSocket(socket);
        socket.data.user = new User({ username, avatar, socket });
    } catch (error) {
        console.error("error", error);

        socket.emit(SERVER_EVENTS.SOCKET_ERROR, {
            error: "Missing username or avatar",
        });
        return socket.conn.close();
    }

    const user = socket.data.user;
    USERS.set(user.id, user);

    socketLog.log(
        `Connected as ${user.username} [socket: ${socket.id}; user: ${user.id}]`
    );

    socket.emit(
        SERVER_EVENTS.ROOM_LIST,
        mapToArray(ROOMS).map((room) => room.getRoomData())
    );
    socket.on(SERVER_EVENTS.ROOM_JOIN, JoinRoomEvent(socket, ROOMS, socketLog));
    socket.on(
        SERVER_EVENTS.ROOM_LEAVE,
        LeaveRoomEvent(socket, ROOMS, socketLog)
    );

    socket.on(
        SERVER_EVENTS.MESSAGE_SEND,
        MessageEvent(socket, ROOMS, socketLog)
    );

    socket.on(
        SERVER_EVENTS.ROUTER_RTP_CAPABILITIES,
        RouterRtpCapabilitiesEvent(router.rtpCapabilities)
    );

    type TransportCreateProps = {
        direction: "recv" | "send";
    };
    socket.on(
        SERVER_EVENTS.TRANSPORT_CREATE,
        async ({ direction }: TransportCreateProps, callback) => {
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
            transportLog.log(socket.id, `${direction} transport created`);

            return callback({ transport: transportData });
        }
    );

    type TransportConnectProps = {
        direction: "recv" | "send";
        dtlsParameters: DtlsParameters;
    };
    socket.on(
        SERVER_EVENTS.TRANSPORT_CONNECT,
        async (
            { direction, dtlsParameters }: TransportConnectProps,
            callback
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
            transportLog.log(socket.id, `connected to ${direction} transport`);

            return callback({});
        }
    );

    type ProduceMediaProps = {
        rtpParameters: RtpParameters;
        clientRtpCapabilities: RtpCapabilities;
        kind: MediaKind;
    };
    socket.on(
        SERVER_EVENTS.PRODUCE_MEDIA,
        async (
            { rtpParameters, clientRtpCapabilities, kind }: ProduceMediaProps,
            callback
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

            producer.on("trace", (trace) => console.log("trace", trace));
            producer.enableTraceEvent(["keyframe"]);

            socket.to(user.room!.id).emit("call-produce", {
                userId: user.id,
                producerId: producer.id,
            });

            return callback({ produceId: producer.id });
        }
    );

    type ConsumeMediaProps = {
        clientRtpCapabilities: RtpCapabilities;
        producerId: string;
    };
    socket.on(
        SERVER_EVENTS.CONSUME_MEDIA,
        async (
            { clientRtpCapabilities, producerId }: ConsumeMediaProps,
            callback
        ) => {
            const user = socket.data.user as User;
            if (!clientRtpCapabilities) {
                return callback({
                    error: "Missing client RTP capabilities",
                });
            } else if (!producerId) {
                console.log("ya pas le producerId");
                return callback({ error: "Missing client producer id" });
            }

            if (
                !router.canConsume({
                    producerId,
                    rtpCapabilities: clientRtpCapabilities,
                })
            ) {
                transportLog.error(
                    socket.id,
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
            transportLog.log(socket.id, "consume success");

            return callback({
                consumerId: consumer.id,
                rtpParameters: consumer.rtpParameters,
            });
        }
    );

    socket.on(SERVER_EVENTS.ROOM_LEAVE, () => clearSocketEvents(socket));

    socket.on(SERVER_EVENTS.SOCKET_DISCONNECTING, () => {
        const user = socket.data.user as User;
        socketLog.log(
            `Disconnecting as ${user.username} [socket:${socket.id}; user:${user.id}]`
        );

        clearSocketEvents(socket);

        // send to all room disconnecting
        socket.rooms.forEach((roomId) => {
            leaveRoom({ roomId, user, socket, ROOMS })
                .then(() => {
                    socketLog.log(`${user.username} leaving room ${roomId}`);
                    socket.to(roomId).emit("user-leave", user.getUserData());
                })
                .catch(console.warn);
        });
        USERS.delete(user.id);
    });
});

function clearSocketEvents(socket: Socket) {
    socket.off(
        SERVER_EVENTS.ROOM_JOIN,
        JoinRoomEvent(socket, ROOMS, socketLog)
    );
    socket.off(
        SERVER_EVENTS.ROOM_LEAVE,
        LeaveRoomEvent(socket, ROOMS, socketLog)
    );
    socket.off(
        SERVER_EVENTS.MESSAGE_SEND,
        MessageEvent(socket, ROOMS, socketLog)
    );
}

async function getUsernameAndAvatarFromSocket(socket: Socket) {
    const username = socket.handshake.query?.["username"] as string;
    const avatar = socket.handshake.query?.["avatar"] as string;

    if (!username || !avatar) {
        socketLog.warn(
            socket.id,
            "Missing username or avatar",
            username,
            avatar
        );

        return Promise.reject();
    }

    return Promise.resolve([username, avatar]);
}

observer.on("newworker", (worker: Worker) => {
    const workerLog = new signale.Signale({
        scope: "worker-" + worker.pid,
    });
    workerLog.log("Worker created");

    worker.observer.on("close", () => workerLog.log("Worker closed"));
    worker.observer.on("newrouter", (router: Router) =>
        workerLog.log("Router created", router.id)
    );
});
