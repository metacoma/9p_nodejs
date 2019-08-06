export interface Reader {
    read(): Promise<Uint8Array>;
}
export interface Writer {
    write(msg: Uint8Array): Promise<void>;
}
export declare class WebSocketReadWriter {
    private socket;
    private hub;
    constructor(url: string);
    read(): Promise<Uint8Array>;
}
