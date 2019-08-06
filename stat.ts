import Qid from "./qid";
import {Uint64} from "./misc";

export default interface Stat {
    typeField: number;
    dev: number;
    qid: Qid;
    mode: number;
    atime: number;
    mtime: number;
    length: Uint64;
    name: string;
    uid: string;
    gid: string;
    muid: string;
}
