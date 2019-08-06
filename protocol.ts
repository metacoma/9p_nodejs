export interface Message {
    t: number;
    tag: number;
    len: number;
    [other: string]: any;
}
