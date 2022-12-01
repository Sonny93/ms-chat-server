import { Router } from "mediasoup/node/lib/Router";

export default function (rtpCapabilities: Router["rtpCapabilities"]) {
    return async (callback: Function) => callback(rtpCapabilities);
}
