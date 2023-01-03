export enum SERVER_EVENTS {
	SOCKET_CONNECTION = "connection",
	SOCKET_DISCONNECTING = "disconnecting",
	SOCKET_ERROR = "error",

	USER_JOIN = "user-join",
	USER_LEAVE = "user-leave",

	ROOM_LIST = "room-list",
	ROOM_JOIN = "room-join",
	ROOM_LEAVE = "room-leave",

	MESSAGE_SEND = "message-send",
	MESSAGE_NEW = "message-new",
	MESSAGE_REMOVE = "message-remove",

	ROUTER_RTP_CAPABILITIES = "router-rtp-capabilities",

	TRANSPORT_CREATE = "transport-create",
	TRANSPORT_CONNECT = "transport-connect",

	PRODUCE_MEDIA = "produce-media",
	CONSUME_MEDIA = "consume-media",
}
