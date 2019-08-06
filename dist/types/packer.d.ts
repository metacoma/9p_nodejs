import Qid from "./qid";
import Stat from "./stat";
import { Uint64 } from "./misc";
export declare function stringToUtf8Buffer(s: string): Uint8Array;
export declare function statToBuffer(s: Stat): Uint8Array;
export declare function messageBuilder(length: number, t: number, tag: number): BufferBuilder;
export declare class BufferBuilder {
    buffer: Uint8Array;
    private view;
    private start;
    constructor(length: number);
    uint8Array(b: Uint8Array): this;
    stringUtf8(b: Uint8Array): this;
    uint8(n: number): this;
    uint16(n: number): this;
    uint32(n: number): this;
    uint64(n: Uint64): this;
    qid(q: Qid): this;
}
