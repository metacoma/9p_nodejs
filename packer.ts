import Qid from "./qid";
import Stat from "./stat";
import {concatBuffers, Uint64} from "./misc";

export function stringToUtf8Buffer(s: string) {
    let str = new TextEncoder("utf-8").encode(s);
    if (str.length > 0xFFFF) {
        str = str.slice(0, 0xFFFF);
    }
    return str;
}

export function statToBuffer(s: Stat) {
    const nameUtf8 = stringToUtf8Buffer(s.name);
    const uidUtf8 = stringToUtf8Buffer(s.uid);
    const gidUtf8 = stringToUtf8Buffer(s.gid);
    const muidUtf8 = stringToUtf8Buffer(s.muid);
    const length = 49 + nameUtf8.length + uidUtf8.length + gidUtf8.length + muidUtf8.length;
    return new BufferBuilder(length).uint16(length - 2).uint16(s.typeField).
        uint32(s.dev).qid(s.qid).uint32(s.mode).uint32(s.atime).uint32(s.mtime).
        uint64(s.length).stringUtf8(nameUtf8).stringUtf8(uidUtf8).stringUtf8(gidUtf8).
        stringUtf8(muidUtf8).buffer;
}

export function messageBuilder(length: number, t: number, tag: number) {
    return new BufferBuilder(length).uint32(length).uint8(t).uint16(tag);
}

export class BufferBuilder {
    buffer: Uint8Array;
    private view: DataView;
    private start: number;

    constructor(length: number) {
        this.buffer = new Uint8Array(length);
        this.view = new DataView(this.buffer.buffer);
        this.start = 0;
    }

    uint8Array(b: Uint8Array) {
        this.buffer.set(b, this.start);
        this.start += b.length;
        return this;
    }

    stringUtf8(b: Uint8Array) {
        return this.uint16(b.length).uint8Array(b);
    }

    uint8(n: number) {
        this.view.setUint8(this.start, n);
        this.start += 1;
        return this;
    }

    uint16(n: number) {
        this.view.setUint16(this.start, n, true);
        this.start += 2;
        return this;
    }

    uint32(n: number) {
        this.view.setUint32(this.start, n, true);
        this.start += 4;
        return this;
    }

    uint64(n: Uint64) {
        this.uint32(n.low).uint32(n.high);
        return this;
    }

    qid(q: Qid) {
        this.uint8Array(q.buffer);
        return this;
    }
}
