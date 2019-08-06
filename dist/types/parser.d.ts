export declare function parse(buffer: Uint8Array, start: number): {
    message: null;
    consumed: number;
} | {
    message: object & {
        len: number;
        t: number;
        tag: number;
    };
    consumed: number;
};
