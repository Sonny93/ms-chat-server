import Logger from "@ioc:Adonis/Core/Logger";
import { Socket } from "socket.io";

import Room from "App/lib/Room";
import { SERVER_EVENTS } from "App/events/events";

export default function (socket: Socket, ROOMS: Map<string, Room>) {
	return async (roomId: string, callback: Function) => {
		if (socket.rooms.has(roomId)) {
			return callback({ error: "Already in this room" });
		}

		const room = ROOMS.get(roomId);
		if (!room) {
			return callback({ error: "Room does not exist" });
		}

		Logger.info(socket.id, `joining room ${roomId}`);

		const user = socket.data.user;
		await room.setUser(user);
		user.setRoom(room);

		socket.join(roomId);
		socket.to(roomId).emit(SERVER_EVENTS.USER_JOIN, user.getUserData());

		callback({ room: room.getRoomData() });
	};
}
