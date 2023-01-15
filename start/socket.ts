import Logger from "@ioc:Adonis/Core/Logger";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

import WorkerService from "App/Services/WorkerService";
import Ws from "App/Services/Ws";
Ws.boot();

import Room from "App/lib/Room";
import User from "App/lib/User";
import { mapToArray } from "App/utils";

const USERS = new Map<string, User>();

const ROOMS = new Map<string, Room>();
[...new Array(5)].map(() => {
	const defaultRoom = new Room();
	ROOMS.set(defaultRoom.id, defaultRoom);
});

import MessageSendEvent from "App/events/message/message";

import RoomJoinEvent from "App/events/room/join-room";
import RoomLeaveEvent from "App/events/room/leave-room";

import RouterRtpCapabilitiesEvent from "App/events/router-rtp-capabilities";

import TransportConnectEvent from "App/events/transport/transport-connect";
import TransportCreateEvent from "App/events/transport/transport-create";

import ConsumeMediaEvent from "App/events/consume-media";
import ProduceMediaEvent from "App/events/produce-media";

import { SERVER_EVENTS } from "App/events/events";
import { leaveRoom } from "App/utils/room";

type SocketProps = Socket<
	DefaultEventsMap,
	DefaultEventsMap,
	DefaultEventsMap,
	{ user: User }
>;

/**
 * Listen for incoming socket connections
 */
Ws.io.on("connection", async (socket) => {
	try {
		const [username, avatar] = await getUsernameAndAvatarFromHandshake(
			socket.handshake
		);
		socket.data.user = new User({ username, avatar, socket });
	} catch (error) {
		Logger.error(`${socket.id} ${error}`);

		socket.emit(SERVER_EVENTS.SOCKET_ERROR, {
			error: "Missing username or avatar",
		});
		return socket.conn.close();
	}

	const user = socket.data.user;
	USERS.set(user.id, user);

	Logger.info(
		`Connected as ${user.username} [socket: ${socket.id}; user: ${user.id}]`
	);

	/* Room Events */
	socket.emit(
		SERVER_EVENTS.ROOM_LIST,
		mapToArray(ROOMS).map((room) => room.getRoomData())
	);
	socket.on(SERVER_EVENTS.ROOM_JOIN, RoomJoinEvent(socket, ROOMS));
	socket.on(SERVER_EVENTS.ROOM_LEAVE, () => {
		RoomLeaveEvent(socket, ROOMS);
		clearSocketEvents(socket);
	});

	/* Message Events */
	socket.on(SERVER_EVENTS.MESSAGE_SEND, MessageSendEvent(socket, ROOMS));

	/* Router Events */
	socket.on(
		SERVER_EVENTS.ROUTER_RTP_CAPABILITIES,
		RouterRtpCapabilitiesEvent(WorkerService.router?.rtpCapabilities)
	);

	/* Transport Events */
	socket.on(
		SERVER_EVENTS.TRANSPORT_CREATE,
		TransportCreateEvent(user, WorkerService.router)
	);
	socket.on(SERVER_EVENTS.TRANSPORT_CONNECT, TransportConnectEvent(user));

	/* Produce Event */
	socket.on(SERVER_EVENTS.PRODUCE_MEDIA, ProduceMediaEvent(user, socket));

	/* Consume Media */
	socket.on(
		SERVER_EVENTS.CONSUME_MEDIA,
		ConsumeMediaEvent(WorkerService.router, user)
	);

	socket.once(SERVER_EVENTS.SOCKET_DISCONNECTING, () => {
		const user = socket.data.user as User;
		Logger.info(
			`Disconnecting as ${user.username} [socket:${socket.id}; user:${user.id}]`
		);

		clearSocketEvents(socket);

		/* Send disconnecting event to all rooms */
		socket.rooms.forEach((roomId) => {
			leaveRoom({ roomId, user, socket, ROOMS })
				.then(() => {
					Logger.info(`${user.username} leaving room ${roomId}`);
					socket.to(roomId).emit("user-leave", user.getUserData());
				})
				.catch(console.warn);
		});
		USERS.delete(user.id);
	});
});

function clearSocketEvents(socket: SocketProps) {
	const user = socket.data.user!;

	socket.off(SERVER_EVENTS.ROOM_JOIN, RoomJoinEvent(socket, ROOMS));
	socket.off(SERVER_EVENTS.ROOM_LEAVE, RoomLeaveEvent(socket, ROOMS));

	socket.off(SERVER_EVENTS.MESSAGE_SEND, MessageSendEvent(socket, ROOMS));

	socket.off(
		SERVER_EVENTS.ROUTER_RTP_CAPABILITIES,
		RouterRtpCapabilitiesEvent(WorkerService.router?.rtpCapabilities)
	);

	socket.off(
		SERVER_EVENTS.TRANSPORT_CREATE,
		TransportCreateEvent(user, WorkerService.router)
	);
	socket.off(SERVER_EVENTS.TRANSPORT_CONNECT, TransportConnectEvent(user));

	socket.off(SERVER_EVENTS.PRODUCE_MEDIA, ProduceMediaEvent(user, socket));

	socket.off(
		SERVER_EVENTS.CONSUME_MEDIA,
		ConsumeMediaEvent(WorkerService.router, user)
	);
}

async function getUsernameAndAvatarFromHandshake(
	handshake: Socket["handshake"]
) {
	const username = handshake.query?.["username"] as string;
	const avatar = handshake.query?.["avatar"] as string;

	if (!username) {
		return Promise.reject(`Missing username`);
	}

	if (!avatar) {
		return Promise.reject(`Missing avatar`);
	}

	return Promise.resolve([username, avatar]);
}
