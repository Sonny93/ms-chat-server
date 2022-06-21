import { createWorker, observer } from 'mediasoup';
import {
	DtlsParameters,
	MediaKind, Router, RtpCapabilities,
	RtpParameters, Worker
} from 'mediasoup/node/lib/types';

import signale from 'signale';

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// Classes
import User from './lib/User.js';
import Room from './lib/Room.js';

// Utils
import { mapToArray } from './utils/index.js';
import { printStatsTransport, transportDataClient } from './utils/transport.js';

// Config
import { HOST_IP, HOST_PORT, MEDIA_CODECS, TRANSPORT_OPTIONS, WORKER_OPTIONS } from './config.js';
import Message from './lib/Message.js';

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
		origin: '*',
		methods: '*'
	}
});

const socketLog = new signale.Signale({ scope: 'Socket' });
httpServer.listen(HOST_PORT, HOST_IP, () => socketLog.log(`Server started as ${HOST_IP}:${HOST_PORT}`));

io.on('connection', (socket: Socket) => {
	const username = socket.handshake.query?.['username'] as string;
	const avatar = socket.handshake.query?.['avatar'] as string;

	if (!username) {
		socketLog.warn(socket.id, 'Try to connect without username');
		socket.emit('error', { error: 'Missing username' });
		socket.conn.close();
		return null;
	} else if (!avatar) {
		socketLog.warn(socket.id, 'Try to connect without avatar');
		socket.emit('error', { error: 'Missing avatar' });
		socket.conn.close();
		return null;
	}

	const user = new User({ username, avatar, socket });
	USERS.set(user.id, user);

	socketLog.log(`Connected as ${username} [socket:${socket.id}; user:${user.id}]`);

	const rooms = mapToArray(ROOMS).map((room) => room.getRoomData());
	socket.emit('rooms', rooms);
	socket.emit('routerRtpCapabilities', router.rtpCapabilities);

	socket.on('join-room', async (roomId: string, callback = function () { }) => {
		if (socket.rooms.has(roomId)) {
			return callback({ error: 'Already in this room' });
		}

		const room = ROOMS.get(roomId);
		if (!room) {
			return callback({ error: 'Room does not exist' });
		}

		socketLog.log(socket.id, `joining room ${roomId}`);
		await room.setUser(user);
		user.setRoom(room);

		socket.join(roomId);
		socket.to(roomId).emit('user-join', user.getUserData());

		callback({ room: room.getRoomData() });
	});

	socket.on('message', (content: string, callback = function () { }) => {
		if (!content.trim()) {
			return callback({ error: 'Message content missing' });
		}

		if (!user.room) {
			return callback({ error: 'User not in room' });
		}

		const room = ROOMS.get(user.room.id);
		if (!room) {
			return callback({ error: 'Unable to find room' });
		}

		const message = new Message({ author: user, content: content.trim() });
		room.addMessage(message);

		socketLog.log('[New message]', socket.id, '>', message.content);

		socket.to(user.room.id).emit('message-new', message.getMessageData());

		return callback({ message: message.getMessageData() });
	});

	socket.on('transport-create', async ({ direction }: { direction: 'recv' | 'send'; }, callback) => {
		const transport = await router.createWebRtcTransport({
			...TRANSPORT_OPTIONS,
			appData: { userId: user.id }
		});

		transport.on('icestatechange', (connectionState) => console.log('[Transport]', 'icestatechange', connectionState));
		transport.on('dtlsstatechange', (connectionState) => {
			console.log('[Transport]', 'dtlsstatechange', connectionState)
			if (connectionState === 'closed') {
				console.log('[Transport]', 'closed');
				clearInterval(inter);
			}
		});

		const inter = setInterval(() => printStatsTransport(transport, direction), 2000);

		if (direction === 'send') {
			user.setSendTransport(transport);
		} else if (direction === 'recv') {
			user.setRecvTransport(transport);
		} else {
			return callback({ error: 'Bad direction' });
		}

		const transportData = await transportDataClient(transport);
		socketLog.log(socket.id, `${direction} transport created`);

		return callback({ transport: transportData });
	});

	socket.on('transport-connect', async ({ direction, dtlsParameters }: { direction: 'recv' | 'send'; dtlsParameters: DtlsParameters; }, callback) => {
		if (!dtlsParameters) {
			return callback({ error: 'Missing DTLS parameters' });
		}

		const transport = direction === 'send'
			? user.getSendTransport()
			: user.getRecvTransport();

		if (!transport) {
			return callback({ error: 'Unable to connect to transport' });
		}

		await transport.connect({ dtlsParameters });
		socketLog.log(socket.id, `connected to ${direction} transport`);

		return callback({});
	});

	socket.on('produceMedia', async ({ rtpParameters, clientRtpCapabilities, kind }: { rtpParameters: RtpParameters; clientRtpCapabilities: RtpCapabilities; kind: MediaKind; }, callback) => {
		if (!rtpParameters) {
			return callback({ error: 'Missing RTP parameters' });
		} else if (!clientRtpCapabilities) {
			return callback({ error: 'Missing client RTP capabilities' });
		} else if (!kind) {
			return callback({ error: 'Missing media Kind' });
		}

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getSendTransport();
		if (!transport) {
			return callback({ error: 'Unable to find transport' });
		}

		const producer = await transport.produce({ kind, rtpParameters });
		socketLog.log(socket.id, 'produce success');

		producer.on('trace', (trace) => console.log('trace', trace));
		producer.enableTraceEvent(['keyframe']);

		return callback({ id: producer.id });
	});

	socket.on('produceMedia', async ({ clientRtpCapabilities, producerId }: { clientRtpCapabilities: RtpCapabilities; producerId: string; }, callback) => {
		if (!clientRtpCapabilities) {
			return callback({ error: 'Missing client RTP capabilities' });
		} else if (!producerId) {
			return callback({ error: 'Missing client producer id' });
		}

		if (!router.canConsume({ producerId, rtpCapabilities: clientRtpCapabilities })) {
			socketLog.error(socket.id, 'cant consume', producerId);
			return callback({ error: 'Cant consume this producerId ' + producerId });
		} else {
			socketLog.log(socket.id, 'can consume');
		}

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getRecvTransport();
		if (!transport) {
			return callback({ error: 'Unable to find transport' });
		}

		const consumer = await transport.consume({ producerId, rtpCapabilities: clientRtpCapabilities });
		socketLog.log(socket.id, 'consume success');

		consumer.on('trace', (trace) => console.log('trace', trace));
		consumer.enableTraceEvent(['keyframe']);

		return callback({ consumerId: consumer.id });
	});

	socket.on('leave-room', async (roomId: string) => {
		const room = ROOMS.get(roomId);
		if (!room) {
			return socketLog.log(`Unable to find room ${roomId}`);
		}

		socketLog.log(`${username} leaving room ${roomId}`);
		socket.to(roomId).emit('user-leave', user.getUserData());

		await room.removeUser(user)
			.catch(console.warn);
	});

	socket.on('disconnecting', () => {
		socketLog.log(`Disconnecting as ${username} [socket:${socket.id}; user:${user.id}]`);
		// send to all room disconnecting
		socket.rooms.forEach((roomId) => {
			socket.to(roomId).emit('user-leave', user.getUserData());
			ROOMS.forEach((room) => room.removeUser(user).catch(console.warn));
		});
		USERS.delete(user.id);
	});
});

observer.on('newworker', (worker: Worker) => {
	const { log: workerLog } = new signale.Signale({ scope: 'worker-' + worker.pid });
	workerLog('Worker created');

	worker.observer.on('close', () => workerLog('Worker closed'));
	worker.observer.on('newrouter', (router: Router) => workerLog('Router created', router.id));
});
