import { DefaultMethods, Signale } from "signale";
import { Socket } from "socket.io";

import Room from "../lib/Room.js";
import { leaveRoom } from "../utils/room.js";
import { SERVER_EVENTS } from "./events.js";

export default function (
    socket: Socket,
    ROOMS: Map<string, Room>,
    socketLog: Signale<DefaultMethods>
) {
    return async (roomId: string) => {
        const room = ROOMS.get(roomId);
        if (!room) {
            return socketLog.log(`Unable to find room ${roomId}`);
        }

        const user = socket.data.user;
        leaveRoom({ roomId, user, socket, ROOMS })
            .then(() => {
                socketLog.log(`${user.username} leaving room ${roomId}`);
                socket
                    .to(roomId)
                    .emit(SERVER_EVENTS.USER_LEAVE, user.getUserData());
            })
            .catch(console.warn);
    };
}
