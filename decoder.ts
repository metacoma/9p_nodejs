import {Reader} from "./io";
import {Message} from "./protocol";
import {parse} from "./parser";
import {concatBuffers, Hub} from "./misc";

export default class Decoder {
    private reader: Reader;
    private buffer: Uint8Array;
    private hub: Hub<Message>;

    constructor(reader: Reader) {
        this.reset(reader);
        this.read();
    }

    reset(reader: Reader) {
        this.reader = reader;
        this.buffer = new Uint8Array(0);
        this.hub = new Hub<Message>();
    }

    private async read() {
        const currentReader = this.reader;
        try {
            const data = await this.reader.read();
            // In case of reset, we might have a different reader here, in
            // that case we want to re-trigger the read call
            if (currentReader === this.reader) {
                const newBuffer = concatBuffers([this.buffer, data]);
                // Parse new messages
                let start = 0;
                let {message, consumed} = parse(newBuffer, start);
                while (message !== null) {
                    this.hub.item(message);
                    start += consumed;
                    const result = parse(newBuffer, start);
                    message = result.message;
                    consumed = result.consumed;
                }
                // Keep remaining partial data here
                this.buffer = newBuffer.slice(start);
            }
        } catch(e) {
            this.hub.error(e);
        }
        setTimeout(this.read, 1);
    }

    next(): Promise<Message> {
        return this.hub.next();
    }
}
