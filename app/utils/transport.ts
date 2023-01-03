import { Transport, WebRtcTransport } from 'mediasoup/node/lib/types';

export async function transportDataClient(transport: WebRtcTransport) {
    const { id, iceParameters, iceCandidates, dtlsParameters, sctpParameters } = transport;
    return { id, iceParameters, iceCandidates, dtlsParameters, sctpParameters };
}

export async function printStatsTransport(transport: Transport, transportType: 'send' | 'recv') {
    const brutStats = (await transport.getStats())[0];
    return console.log(brutStats);
}