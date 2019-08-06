import {Uint64} from "./misc";

export default class Qid {
    buffer: Uint8Array
    private view: DataView

    constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.view = new DataView(buffer.buffer);
    }

    type() {
        return this.view.getUint8(0);
    }

    version() {
        return this.view.getUint32(1, true);
    }

    path(): Uint64 {
        return {
            low: this.view.getUint32(5, true),
            high: this.view.getUint32(9, true)
        };
    }
}
