import { createWorker, observer } from 'mediasoup';
import {
	MediaKind, Router, RtpCapabilities,
	RtpParameters, Worker
} from 'mediasoup/node/lib/types';

import signale from 'signale';

import fastcors from '@fastify/cors';
import Fastify, { FastifyRequest } from 'fastify';
import fastsio from 'fastify-socket.io';

import { HOST_IP, HOST_PORT, MEDIA_CODECS, WORKER_OPTIONS } from './config.js';
import User from './lib/User.js';

// Routes
import { Socket } from 'socket.io';
import routeIndex from './routes/index.js';
import routeTransport from './routes/transport.js';

const USERS = new Map<string, User>();
const fastify = Fastify({ logger: false });

const worker = await createWorker(WORKER_OPTIONS);
const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });

fastify.addContentTypeParser('*', {
	parseAs: 'string',
	bodyLimit: 0
}, fastify.getDefaultJsonParser('ignore', 'ignore'));

fastify.register(fastcors, { origin: '*', methods: '*' });
fastify.register(fastsio, { cors: { origin: '*', methods: '*' } });

fastify.register(routeIndex(router, USERS), { prefix: '/' });
fastify.register(routeTransport(router, USERS), { prefix: '/transport' });

fastify.register(async function (fastify) {
	fastify.post('/produceMedia', async (req: FastifyRequest<{ Body: { userId: string; rtpParameters: RtpParameters; clientRtpCapabilities: RtpCapabilities; kind: MediaKind; } }>) => {
		const userId = req.body.userId;
		if (!userId) return Promise.reject('Missing userId');

		const user = USERS.get(userId);
		if (!user) return Promise.reject('User not found with userId ' + userId);

		const rtpParameters = req.body.rtpParameters;
		if (!rtpParameters) return Promise.reject('Missing rtpParameters');

		const clientRtpCapabilities = req.body.clientRtpCapabilities;
		if (!clientRtpCapabilities) return Promise.reject('Missing clientRtpCapabilities');

		const kind = req.body.kind;
		if (!kind) return Promise.reject('Missing media kind');

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getSendTransport();
		if (!transport) return Promise.reject('unable to find transport');

		const producer = await transport.produce({ kind, rtpParameters, });
		producer.on('trace', (trace) => console.log('trace', trace));
		producer.enableTraceEvent(['keyframe']);

		return { id: producer.id };
	});

	fastify.post('/consumeMedia', async (req: FastifyRequest<{ Body: { userId: string; clientRtpCapabilities: RtpCapabilities; producerId: string; } }>) => {
		const userId = req.body.userId;
		if (!userId) return Promise.reject('Missing userId');

		const user = USERS.get(userId);
		if (!user) return Promise.reject('User not found with userId ' + userId);

		const clientRtpCapabilities = req.body.clientRtpCapabilities;
		if (!clientRtpCapabilities) return Promise.reject('clientRtpCapabilities missing');

		const producerId = req.body.producerId;
		if (!producerId) return Promise.reject('producerId missing');

		if (!router.canConsume({ producerId, rtpCapabilities: clientRtpCapabilities })) {
			console.error('cant consume media ' + producerId + ' ' + userId);
			return Promise.reject('cant consume media ' + producerId + ' ' + userId);
		} else {
			console.log('can consume');
		}

		user.setClientRtpCapabilities(clientRtpCapabilities);

		const transport = user.getRecvTransport();
		if (!transport) return Promise.reject('unable to find transport');

		const consumer = await transport.consume({ producerId, rtpCapabilities: clientRtpCapabilities });
		consumer.on('trace', (trace) => console.log('trace', trace));
		consumer.enableTraceEvent(['keyframe']);

		return { consumerId: consumer.id };
	});
});


await fastify.listen({ port: HOST_PORT, host: HOST_IP });
signale.log(`API started as ${HOST_IP}:${HOST_PORT}`);

fastify.io.on('connection', (socket: Socket) => {
	console.log('socket connected');
	socket.emit('yes');

	socket.on('server-config', () => {
		const user = new User();
		USERS.set(user.getId(), user);

		return {
			routerRtpCapabilities: router.rtpCapabilities,
			id: user.getId()
		};
	});

	socket.on('users', () => {
		const users = Array
			.from(USERS, ([_, value]) => (value))
			.map((user) => user.getUserData());

		// todo: socket event callback
	})
});

observer.on('newworker', (worker: Worker) => {
	const { log: workerLog } = new signale.Signale({ scope: 'worker-' + worker.pid });

	workerLog('Worker created');
	worker.observer.on('close', () => workerLog('Worker closed'));
	worker.observer.on('newrouter', (router: Router) => workerLog('Router created', router.id));
});
