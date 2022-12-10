import {
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
} from "mediasoup/node/lib/types";

export const WORKER_OPTIONS = {
    logLevel: "debug",
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
} as WorkerSettings;

export const HOST_IP = "0.0.0.0";
export const HOST_ANNOUNCED_IP = "192.168.200.65"; // or 127.0.0.1
export const HOST_PORT = 4000;

const listenIps = [
    {
        ip: HOST_IP,
        announcedIp: HOST_ANNOUNCED_IP,
    },
];
export const TRANSPORT_OPTIONS = {
    listenIps,
    enableTcp: true,
    enableUdp: true,
    initialAvailableOutgoingBitrate: 800000,
    enableSctp: true,
} as WebRtcTransportOptions;

export const MEDIA_CODECS: RtpCodecCapability[] = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {},
    },
    {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "4d0032",
            "level-asymmetry-allowed": 1,
        },
    },
    {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
        },
    },
];
