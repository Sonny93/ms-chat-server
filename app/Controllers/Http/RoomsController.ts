// import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

import Room from "App/lib/Room";
import { mapToArray } from "App/utils";

const ROOMS = new Map<string, Room>();
[...new Array(5)].map(() => {
	const defaultRoom = new Room();
	ROOMS.set(defaultRoom.id, defaultRoom);
});

export default class RoomsController {
	public async index() {
		return {
			rooms: mapToArray(ROOMS).map((room) => room.getRoomData()),
		};
	}
}
