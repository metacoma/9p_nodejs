import { Reader } from "./io";
import { Message } from "./protocol";
export default class Decoder {
    private reader;
    private buffer;
    private hub;
    constructor(reader: Reader);
    reset(reader: Reader): void;
    private read();
    next(): Promise<Message>;
}
