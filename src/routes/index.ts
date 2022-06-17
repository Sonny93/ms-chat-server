import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Router } from 'mediasoup/node/lib/types';

import User from '../lib/User.js';

let router: Router;
let USERS: Map<string, User>;

export default function (routerProps: Router, usersProps: Map<string, User>) {
    router = routerProps;
    USERS = usersProps;

    return function (fastify: FastifyInstance, opts: FastifyPluginOptions, done: (props: Error | undefined) => void) {
        fastify.get('/', index);
        fastify.get('/routerRtpCapabilities', routerRtpCapabilities);
        done(undefined);
    }
}

async function index() {
    return { hello: 'world' }
}

async function routerRtpCapabilities() {
    const user = new User();
    USERS.set(user.getId(), user);

    return { routerRtpCapabilities: router.rtpCapabilities, id: user.getId() };
}