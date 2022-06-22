import signale from 'signale';
import { Socket } from 'socket.io';
import Room from '../lib/Room';

export default function (socket: Socket, ROOMS: Map<string, Room>, socketLog: signale.Signale<signale.DefaultMethods>) {
    return async (roomId: string, callback: Function) => {
        if (socket.rooms.has(roomId)) {
            return callback({ error: 'Already in this room' });
        }

        const room = ROOMS.get(roomId);
        if (!room) {
            return callback({ error: 'Room does not exist' });
        }

        socketLog.log(socket.id, `joining room ${roomId}`);

        const user = socket.data.user;
        await room.setUser(user);
        user.setRoom(room);

        socket.join(roomId);
        socket.to(roomId).emit('user-join', user.getUserData());

        callback({ room: room.getRoomData() });
    }
}