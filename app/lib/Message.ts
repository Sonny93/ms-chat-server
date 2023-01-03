import User from "./User";

export default class Message {
	id: string;
	author: User;
	content: string;

	constructor({ author, content }: { author: User; content: string }) {
		this.id = (Date.now() + Math.random() * 10000).toString();
		this.author = author;
		this.content = content;
	}

	getMessageData = () => ({
		id: this.id,
		author: this.author.getUserData(),
		content: this.content,
	});
}
