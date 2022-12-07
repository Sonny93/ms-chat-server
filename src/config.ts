import {
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
} from "mediasoup/node/lib/types";
import { networkInterfaces } from "node:os";

export const WORKER_OPTIONS = {
    logLevel: "debug",
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
} as WorkerSettings;

const net = networkInterfaces();
const localAddresses = Object.entries(net)
    .filter(([key]) => key !== "lo") // remove loopback addr
    .flatMap(([_, value]) => value);

export const HOST_IP = "0.0.0.0";

// Local IP Address
// export const HOST_ANNOUNCED_IP = "192.168.1.23";
export const HOST_ANNOUNCED_IP = localAddresses[0]?.address ?? "127.0.0.1";

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
