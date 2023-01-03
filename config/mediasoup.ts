import {
	RtpCodecCapability,
	WebRtcTransportOptions,
	WorkerSettings,
} from "mediasoup/node/lib/types";

export const WORKER_OPTIONS = {
	logLevel: "debug",
	logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
	rtcMinPort: process.env.WORKER_RTC_MIN_PORT || 40000,
	rtcMaxPort: process.env.WORKER_RTC_MAX_PORT || 49999,
} as WorkerSettings;

export const HOST_IP = process.env.HOST_IP || "0.0.0.0";
export const HOST_ANNOUNCED_IP = process.env.HOST_ANNOUNCED_IP || "127.0.0.1";
export const HOST_PORT = parseInt(process.env.HOST_PORT || "", 10) || 4000;

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
