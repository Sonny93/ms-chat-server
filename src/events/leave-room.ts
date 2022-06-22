import { Socket } from 'socket.io';
import signale from 'signale';

import Room from '../lib/Room.js';
import { leaveRoom } from '../utils/room.js';

export default function (socket: Socket, ROOMS: Map<string, Room>, socketLog: signale.Signale<signale.DefaultMethods>) {
    return async (roomId: string) => {
        const room = ROOMS.get(roomId);
        if (!room) {
            return socketLog.log(`Unable to find room ${roomId}`);
        }

        const user = socket.data.user;
        leaveRoom({ roomId, user, socket, ROOMS })
            .then(() => {
                socketLog.log(`${user.username} leaving room ${roomId}`);
                socket.to(roomId).emit('user-leave', user.getUserData());
            })
            .catch(console.warn);
    }
}