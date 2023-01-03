import Logger from "@ioc:Adonis/Core/Logger";

import { createWorker, observer } from "mediasoup";
import { Router, Worker } from "mediasoup/node/lib/types";

import { WORKER_OPTIONS, MEDIA_CODECS } from "Config/mediasoup";

class WorkerService {
	public worker: Worker;
	public router: Router;
	private booted = false;

	public async boot() {
		/**
		 * Ignore multiple calls to the boot method
		 */
		if (this.booted) {
			return;
		}

		this.booted = true;
		this.worker = await createWorker(WORKER_OPTIONS);
		this.router = await this.worker.createRouter({
			mediaCodecs: MEDIA_CODECS,
		});

		console.log("là");

		observer.on("newworker", (worker: Worker) => {
			Logger.info("Worker created");

			worker.observer.on("close", () => Logger.info("Worker closed"));
			worker.observer.on("newrouter", (router: Router) =>
				Logger.info("Router created", router.id)
			);
		});
	}
}

export default new WorkerService();
