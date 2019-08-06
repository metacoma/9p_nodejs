export interface Uint64 {
    low: number;
    high: number;
}

export function concatBuffers(buffers: Array<Uint8Array>) {
    let length = 0;
    for (let buffer of buffers) {
        length += buffer.length;
    }
    let result = new Uint8Array(length);
    let offset = 0;
    for (let buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}

// This is just a customized version of EventEmitter, we customize it to our
// needs here hoping to reduce the library size.
export class Hub<T> {
    private bufferedItems: Array<T>;
    private pendingRequests: Array<(t: T | null, error: Error | null) => void>;
    private currentError: Error | null;

    constructor() {
        this.bufferedItems = [];
        this.pendingRequests = [];
        this.currentError = null;
    }

    item(t: T) {
        const request = this.pendingRequests.shift();
        if (request) {
            request(t, null);
        } else {
            this.bufferedItems.push(t);
        }
    }

    error(error: Error) {
        this.pendingRequests.map(r => r(null, error));
        this.pendingRequests = [];
        this.currentError = error;
    }

    next(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.currentError) {
                reject(this.currentError);
                return;
            }
            const item = this.bufferedItems.shift();
            if (item) {
                resolve(item);
                return;
            }
            this.pendingRequests.push((item, error) => {
                if (item) {
                    resolve(item);
                } else {
                    reject(error);
                }
            })
        });
    }
}
