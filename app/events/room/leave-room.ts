import Logger from "@ioc:Adonis/Core/Logger";
import { Socket } from "socket.io";

import Room from "App/lib/Room";
import { leaveRoom } from "App/utils/room";
import { SERVER_EVENTS } from "App/events/events";

export default function (socket: Socket, ROOMS: Map<string, Room>) {
	return async (roomId: string) => {
		const room = ROOMS.get(roomId);
		if (!room) {
			return Logger.info(`Unable to find room ${roomId}`);
		}

		const user = socket.data.user;
		leaveRoom({ roomId, user, socket, ROOMS })
			.then(() => {
				Logger.info(`${user.username} leaving room ${roomId}`);
				socket
					.to(roomId)
					.emit(SERVER_EVENTS.USER_LEAVE, user.getUserData());
			})
			.catch(console.warn);
	};
}
