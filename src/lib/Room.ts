import User from './User.js';
import Message from './Message';
import { randomString } from '../utils/index.js';

export default class Room {
    id: string;
    name: string;
    users: User[];
    messages: Message[];

    constructor() {
        this.id = (Date.now() + (Math.random() * 10000)).toString();
        this.name = `room-${randomString(25)}`;

        this.users = [];
        this.messages = [];
    }

    getUsers = () => this.users.map((user) => user.getUserData());
    setUser = async (user: User) => {
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            return Promise.reject('User already in this room');
        }

        this.users.push(user);
    }
    removeUser = async (user: User) => {
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex === -1) {
            return Promise.reject('Unable to find user ' + user.id + ' in room ' + this.id);
        }

        this.users.splice(userIndex, 1);
    }

    getMessages = () => this.messages.map((message) => message.getMessageData());
    addMessage = (message: Message) => this.messages.push(message);

    getRoomData = () => ({
        id: this.id,
        name: this.name,
        users: this.getUsers(),
        messages: this.getMessages()
    });
}