import {Hub} from "./misc";

export interface Reader {
    read(): Promise<Uint8Array>
}

export interface Writer {
    write(msg: Uint8Array): Promise<void>
}

export class WebSocketReadWriter {
    private socket: WebSocket;
    private hub: Hub<Uint8Array>;

    constructor(url: string) {
        this.hub = new Hub<Uint8Array>();
				this.socket = new WebSocket(url);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = (message) => {
            this.hub.item(new Uint8Array(message.data));
        };
        this.socket.onerror = this.socket.onclose = () => {
            this.hub.error(new Error("Socket closed"));
        };
    }

    read(): Promise<Uint8Array> {
        return this.hub.next();
    }
}
