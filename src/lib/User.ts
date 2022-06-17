import { RtpCapabilities, WebRtcTransport } from 'mediasoup/node/lib/types';

export default class User {
    id: string;
    username: string;
    clientRtpCapabilities: RtpCapabilities | null;
    recvTransport: WebRtcTransport | null;
    sendTransport: WebRtcTransport | null;

    constructor() {
        this.id = (Date.now() + (Math.random() * 10000)).toString();
        this.username = 'user-' + this.id;
        this.clientRtpCapabilities = null;

        this.recvTransport = null;
        this.sendTransport = null;
    }

    getId = () => this.id;
    getUserName = () => this.username;

    getClientRtpCapabilities = () => this.clientRtpCapabilities;
    setClientRtpCapabilities = (clientRtpCapabilities: RtpCapabilities) => this.clientRtpCapabilities = clientRtpCapabilities;

    getRecvTransport = () => this.recvTransport;
    setRecvTransport = (transport: WebRtcTransport) => this.recvTransport = transport;

    getSendTransport = () => this.sendTransport;
    setSendTransport = (transport: WebRtcTransport) => this.sendTransport = transport;

    getUserData = () => ({
        id: this.id,
        username: this.username
    })
}