import { RtpCapabilities, WebRtcTransport } from 'mediasoup/node/lib/types';
import { Socket } from 'socket.io';
import Room from './Room';

export default class User {
    id: string;
    username: string;
    avatar: string;
    room: Room | null;
    private clientRtpCapabilities: RtpCapabilities | null;
    private recvTransport: WebRtcTransport | null;
    private sendTransport: WebRtcTransport | null;

    constructor({ username, avatar, socket }: { username: string; avatar: string; socket: Socket; }) {
        if (!username) {
            throw new Error('No username provided on construct user');
        } else if (!socket) {
            throw new Error('No socket connection provided on construct user');
        }

        this.id = (Date.now() + (Math.random() * 10000)).toString();
        this.username = username;
        this.avatar = avatar;
        this.room = null;
        this.clientRtpCapabilities = null;

        this.recvTransport = null;
        this.sendTransport = null;
    }

    getClientRtpCapabilities = () => this.clientRtpCapabilities;
    setClientRtpCapabilities = (clientRtpCapabilities: RtpCapabilities) => this.clientRtpCapabilities = clientRtpCapabilities;

    getRecvTransport = () => this.recvTransport;
    setRecvTransport = (transport: WebRtcTransport) => this.recvTransport = transport;

    getSendTransport = () => this.sendTransport;
    setSendTransport = (transport: WebRtcTransport) => this.sendTransport = transport;

    setRoom = (room: Room) => this.room = room;
    clearRoom = () => this.room = null;

    getUserData = () => ({
        id: this.id,
        username: this.username,
        avatar: this.avatar
    });
}