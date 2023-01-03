import Logger from "@ioc:Adonis/Core/Logger";
import { Socket } from "socket.io";

import Message from "App/lib/Message";
import Room from "App/lib/Room";
import { SERVER_EVENTS } from "App/events/events";

export default function (socket: Socket, ROOMS: Map<string, Room>) {
	return (content: string, callback: Function) => {
		if (!content.trim()) {
			return callback({ error: "Message content missing" });
		}

		const user = socket.data.user;
		if (!user.room) {
			return callback({ error: "User not in room" });
		}

		const room = ROOMS.get(user.room.id);
		if (!room) {
			return callback({ error: "Unable to find room" });
		}

		const message = new Message({ author: user, content: content.trim() });
		room.addMessage(message);

		Logger.info("[New message]", socket.id, ">", message.content);

		socket
			.to(user.room.id)
			.emit(SERVER_EVENTS.MESSAGE_NEW, message.getMessageData());

		return callback({ message: message.getMessageData() });
	};
}
