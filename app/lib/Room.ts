import { Transport } from "mediasoup/node/lib/Transport";

import Message from "./Message";
import User from "./User";

import { randomString } from "App/utils/index";
import { Producer } from "mediasoup/node/lib/Producer";

// TODO: Stocker les producer ID et les envoyer au front

export default class Room {
	id: string;
	name: string;

	users: User[];
	messages: Message[];

	transports: Transport[];
	producers: Producer[];

	constructor() {
		this.id = (Date.now() + Math.random() * 10000).toString();
		this.name = `room-${randomString(25)}`;

		this.users = [];
		this.messages = [];

		this.transports = [];
		this.producers = [];
	}

	/* Users */
	getUsers = () => {
		return this.users.map((user) => user.getUserData());
	};
	setUser = async (user: User) => {
		const userIndex = this.users.findIndex((u) => u.id === user.id);
		if (userIndex !== -1) {
			return Promise.reject("User already in this room");
		}

		this.users.push(user);
	};
	removeUser = async (user: User) => {
		const userIndex = this.users.findIndex((u) => u.id === user.id);
		if (userIndex === -1) {
			return Promise.reject(
				"Unable to find user " + user.id + " in room " + this.id
			);
		}

		this.users.splice(userIndex, 1);
		this.transports = this.transports.filter(
			(t) => t.appData.userId !== user.id
		);
	};

	/* Messages */
	getMessages = () => {
		return this.messages.map((message) => message.getMessageData());
	};
	addMessage = (message: Message) => {
		this.messages.push(message);
	};

	/* Transports */
	addTransport = (transport: Transport) => {
		this.transports.push(transport);
	};
	getTransport = (transportId: Transport["id"]) => {
		return this.transports.find(({ id }) => id === transportId);
	};
	getTransports = () => {
		return this.transports.map(({ id }) => id);
	};
	removeTransport = async (transportId: Transport["id"]) => {
		const transportIndex = this.transports.findIndex(
			({ id }) => id === transportId
		);
		if (transportIndex === -1) {
			return Promise.reject(
				`Unable to find transport ${transportId} in room ${this.id}`
			);
		}

		this.transports.splice(transportIndex, 1);
	};

	/* Producers */
	addProducer = (producer: Producer) => {
		this.producers.push(producer);
	};
	getProducer = (producerId: Producer["id"]) => {
		return this.producers.find(({ id }) => id === producerId);
	};
	getProducers = () => {
		return this.producers.map(({ id, appData }) => ({
			producerId: id,
			userId: appData.userId,
		}));
	};
	removeProducer = async (producerId: Producer["id"]) => {
		const producerIndex = this.producers.findIndex(
			({ id }) => id === producerId
		);
		if (producerIndex === -1) {
			return Promise.reject(
				`Unable to find producer ${producerId} in room ${this.id}`
			);
		}

		this.producers.splice(producerIndex, 1);
	};

	getRoomData = () => ({
		id: this.id,
		name: this.name,
		users: this.getUsers(),
		messages: this.getMessages(),
		transports: this.getTransports(),
		producers: this.getProducers(),
	});
}
