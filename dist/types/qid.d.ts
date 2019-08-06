import { Uint64 } from "./misc";
export default class Qid {
    buffer: Uint8Array;
    private view;
    constructor(buffer: Uint8Array);
    type(): number;
    version(): number;
    path(): Uint64;
}
