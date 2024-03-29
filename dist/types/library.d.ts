import Encoder from "./encoder";
import Decoder from "./decoder";
import Qid from "./qid";
import { WebSocketReadWriter } from "./io";
declare const _default: {
    Decoder: typeof Decoder;
    Encoder: typeof Encoder;
    consts: {
        TVERSION: number;
        RVERSION: number;
        TAUTH: number;
        RAUTH: number;
        TATTACH: number;
        RATTACH: number;
        RERROR: number;
        TFLUSH: number;
        RFLUSH: number;
        TWALK: number;
        RWALK: number;
        TOPEN: number;
        ROPEN: number;
        TCREATE: number;
        RCREATE: number;
        TREAD: number;
        RREAD: number;
        TWRITE: number;
        RWRITE: number;
        TCLUNK: number;
        RCLUNK: number;
        TREMOVE: number;
        RREMOVE: number;
        TSTAT: number;
        RSTAT: number;
        TWSTAT: number;
        RWSTAT: number;
        NO_TAG: number;
    };
    Qid: typeof Qid;
    WebSocketReadWriter: typeof WebSocketReadWriter;
};
export default _default;
