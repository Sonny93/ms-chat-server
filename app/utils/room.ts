import { Socket } from 'socket.io';

import Room from '../lib/Room.js';
import User from '../lib/User.js';

export async function leaveRoom({ roomId, user, socket, ROOMS }: { roomId: string; user: User; socket: Socket; ROOMS: Map<string, Room> }) {
    const room = ROOMS.get(roomId);
    if (!room) {
        return Promise.reject(`Unable to find room ${roomId}`);
    }

    await room.removeUser(user).catch(console.warn);
    user.clearRoom();

    socket.to(roomId).emit('user-leave', user.getUserData());
    socket.leave(roomId);

    return Promise.resolve();
}