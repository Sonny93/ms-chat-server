import Logger from "@ioc:Adonis/Core/Logger";
import { Socket } from "socket.io";

import Room from "App/lib/Room";
import { SERVER_EVENTS } from "App/events/events";

export default function (socket: Socket, ROOMS: Map<string, Room>) {
	return async (roomId: string, callback: Function) => {
		if (socket.rooms.has(roomId)) {
			Logger.error(
				`${socket.data.user.username} already in room: ${roomId}`
			);
			return callback({ error: "Already in this room" });
		}

		const room = ROOMS.get(roomId);
		if (!room) {
			Logger.error(
				`${socket.data.user.username} room ${roomId} does not exist`
			);
			return callback({ error: "Room does not exist" });
		}

		const user = socket.data.user;
		Logger.info(`${user.username} joining room ${roomId}`);

		await room.setUser(user);
		user.setRoom(room);

		socket.join(roomId);
		socket.to(roomId).emit(SERVER_EVENTS.USER_JOIN, user.getUserData());

		callback({ room: room.getRoomData() });
	};
}
