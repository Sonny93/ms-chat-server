// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import WorkerService from "App/Services/WorkerService";

export default class RtpCapabilitiesController {
	public index = async () => ({
		rtpCapabilities: WorkerService.router?.rtpCapabilities,
	});
}
