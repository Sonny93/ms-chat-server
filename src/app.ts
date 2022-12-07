import { createWorker, observer } from "mediasoup";
import { Router, Worker } from "mediasoup/node/lib/types";

import signale from "signale";

import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

// Classes
import Room from "./lib/Room.js";
import User from "./lib/User.js";

// Utils
import { mapToArray } from "./utils/index.js";

// Config
import { HOST_IP, HOST_PORT, MEDIA_CODECS, WORKER_OPTIONS } from "./config.js";

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

import MessageSendEvent from "./events/message/message.js";

import RoomJoinEvent from "./events/room/join-room.js";
import RoomLeaveEvent from "./events/room/leave-room.js";

import RouterRtpCapabilitiesEvent from "./events/router-rtp-capabilities.js";

import TransportConnectEvent from "./events/transport/transport-connect.js";
import TransportCreateEvent from "./events/transport/transport-create.js";

import ConsumeMediaEvent from "./events/consume-media.js";
import ProduceMediaEvent from "./events/produce-media.js";

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

    /* Room Events */
    socket.emit(
        SERVER_EVENTS.ROOM_LIST,
        mapToArray(ROOMS).map((room) => room.getRoomData())
    );
    socket.on(SERVER_EVENTS.ROOM_JOIN, RoomJoinEvent(socket, ROOMS, socketLog));
    socket.on(SERVER_EVENTS.ROOM_LEAVE, () => {
        RoomLeaveEvent(socket, ROOMS, socketLog);
        clearSocketEvents(socket);
    });

    /* Message Events */
    socket.on(
        SERVER_EVENTS.MESSAGE_SEND,
        MessageSendEvent(socket, ROOMS, socketLog)
    );

    /* Router Events */
    socket.on(
        SERVER_EVENTS.ROUTER_RTP_CAPABILITIES,
        RouterRtpCapabilitiesEvent(router.rtpCapabilities)
    );

    /* Transport Events */
    socket.on(
        SERVER_EVENTS.TRANSPORT_CREATE,
        TransportCreateEvent(user, router, socket.id, transportLog)
    );
    socket.on(
        SERVER_EVENTS.TRANSPORT_CONNECT,
        TransportConnectEvent(user, socket.id, transportLog)
    );

    /* Produce Event */
    socket.on(
        SERVER_EVENTS.PRODUCE_MEDIA,
        ProduceMediaEvent(user, socket, socketLog)
    );

    /* Consume Media */
    socket.on(
        SERVER_EVENTS.CONSUME_MEDIA,
        ConsumeMediaEvent(router, user, socket.id, transportLog)
    );

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
        RoomJoinEvent(socket, ROOMS, socketLog)
    );
    socket.off(
        SERVER_EVENTS.ROOM_LEAVE,
        RoomLeaveEvent(socket, ROOMS, socketLog)
    );
    socket.off(
        SERVER_EVENTS.MESSAGE_SEND,
        MessageSendEvent(socket, ROOMS, socketLog)
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
