export interface Uint64 {
    low: number;
    high: number;
}
export declare function concatBuffers(buffers: Array<Uint8Array>): Uint8Array;
export declare class Hub<T> {
    private bufferedItems;
    private pendingRequests;
    private currentError;
    constructor();
    item(t: T): void;
    error(error: Error): void;
    next(): Promise<T>;
}
