import { RtpCodecCapability, WebRtcTransportOptions, WorkerSettings } from 'mediasoup/node/lib/types';

export const HOST_IP = '0.0.0.0';
export const HOST_ANNOUNCED_IP = '10.22.11.91';
// export const HOST_ANNOUNCED_IP = '10.168.43.252';
export const HOST_PORT = 4000;

export const WORKER_OPTIONS = {
    logLevel: 'debug',
    logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
    ],
    rtcMinPort: 40000,
    rtcMaxPort: 49999
} as WorkerSettings;

export const TRANSPORT_OPTIONS = {
    listenIps: [{ ip: HOST_IP, announcedIp: HOST_ANNOUNCED_IP }],
    enableTcp: true,
    enableUdp: true,
    initialAvailableOutgoingBitrate: 800000,
    // enableSctp: true
} as WebRtcTransportOptions;

export const MEDIA_CODECS: RtpCodecCapability[] = [{
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
}, {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {}
}, {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
        'packetization-mode': 1,
        'profile-level-id': '4d0032',
        'level-asymmetry-allowed': 1
    }
}, {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1
    }
}];