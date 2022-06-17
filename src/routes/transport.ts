import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { DtlsParameters, Router } from 'mediasoup/node/lib/types';

import { TRANSPORT_OPTIONS } from '../config.js';
import User from '../lib/User.js';
import { printStatsTransport, transportDataClient } from '../utils/transport.js';

let router: Router;
let USERS: Map<string, User>;

export default function (routerProps: Router, usersProps: Map<string, User>) {
    router = routerProps;
    USERS = usersProps;

    return function (fastify: FastifyInstance, opts: FastifyPluginOptions, done: (props: Error | undefined) => void) {
        fastify.post('/create/:transportType', create);
        fastify.post('/connect/:transportType', connect);
        done(undefined);
    }
}

async function connect(req: FastifyRequest<{ Params: { transportType: 'send' | 'recv' }, Body: { userId: string; dtlsParameters: DtlsParameters; } }>) {
    const { transportType } = req.params;

    const userId = req.body.userId;
    if (!userId) return Promise.reject('Missing userId');

    const user = USERS.get(userId);
    if (!user) return Promise.reject('User not found with userId ' + userId);

    const dtlsParameters = req.body.dtlsParameters;
    if (!dtlsParameters) return Promise.reject('dtlsParameters missing');

    const transport = transportType === 'send'
        ? user.getSendTransport()
        : user.getRecvTransport();

    if (!transport) return Promise.reject('unable to connect to transport');

    await transport.connect({ dtlsParameters });
    return {};
}

async function create(req: FastifyRequest<{ Params: { transportType: 'send' | 'recv' }, Body: { userId: string; } }>) {
    const { transportType } = req.params;

    const userId = req.body.userId as string;
    if (!userId) return Promise.reject('Missing userId');

    const user = USERS.get(userId);
    if (!user) return Promise.reject('User not found with userId ' + userId);

    const transport = await router.createWebRtcTransport({
        ...TRANSPORT_OPTIONS,
        appData: { userId }
    });


    transport.on('icestatechange', (connectionState) => console.log('[Transport]', 'icestatechange', connectionState));
    transport.on('dtlsstatechange', (connectionState) => {
        console.log('[Transport]', 'dtlsstatechange', connectionState)
        if (connectionState === 'closed') {
            console.log('[Transport]', 'closed');
            clearInterval(inter);
        }
    });

    const inter = setInterval(() => printStatsTransport(transport, transportType), 2000);

    if (transportType === 'send')
        user.setSendTransport(transport);
    else if (transportType)
        user.setRecvTransport(transport);

    const transportData = await transportDataClient(transport);
    return { transport: transportData };
}