import {Message} from "./protocol";
import consts from "./consts";
import Stat from "./stat";
import Qid from "./qid";
import {Uint64} from "./misc";

const INVALID_EOF = new Error("Invalid EOF!");

export function parse(buffer: Uint8Array, start: number) {
    if (!ensureSize(buffer, start, 4)) {
        return {
            message: null,
            consumed: 0
        };
    }
    const {value: len} = parseUint32(buffer, start);
    // len contains the full message length, including its own 4 bytes
    if (!ensureSize(buffer, start, len)) {
        return {
            message: null,
            consumed: 0
        };
    }
    const {value: t} = parseUint8(buffer, start + 4);
    const {value: tag} = parseUint16(buffer, start + 5);
    const parser = PARSERS[t];
    if (!parser) {
        throw new Error("Parser for type " + t + " does not exist!");
    }
    const data = parser(buffer.slice(start + 7, start + len));
    const message = Object.assign({}, data, {
        len,
        t,
        tag
    });
    return {
        message,
        consumed: len
    };
}

interface ParserMap {
    [key: number]: (buffer: Uint8Array) => object
}

const PARSERS: ParserMap = {
    [consts.TVERSION]: parseTversion,
    [consts.RVERSION]: parseTversion,
    [consts.TAUTH]: parseTauth,
    [consts.RAUTH]: parseRauth,
    [consts.TATTACH]: parseTattach,
    [consts.RATTACH]: parseRattach,
    [consts.RERROR]: parseRerror,
    [consts.TFLUSH]: parseTflush,
    [consts.RFLUSH]: parseEmpty,
    [consts.TWALK]: parseTwalk,
    [consts.RWALK]: parseRwalk,
    [consts.TOPEN]: parseTopen,
    [consts.ROPEN]: parseRopen,
    [consts.TCREATE]: parseTcreate,
    [consts.RCREATE]: parseRopen,
    [consts.TREAD]: parseTread,
    [consts.RREAD]: parseRread,
    [consts.TWRITE]: parseTwrite,
    [consts.RWRITE]: parseRwrite,
    [consts.TCLUNK]: parseTclunk,
    [consts.RCLUNK]: parseEmpty,
    [consts.TREMOVE]: parseTclunk,
    [consts.RREMOVE]: parseEmpty,
    [consts.TSTAT]: parseTclunk,
    [consts.RSTAT]: parseRstat,
    [consts.TWSTAT]: parseTwstat,
    [consts.RWSTAT]: parseEmpty
};

function parseTversion(buffer: Uint8Array) {
    const {value: msize} = parseUint32(buffer, 0);
    const {value: version} = parseString(buffer, 4);
    return {
        msize,
        version
    }
}

function parseTauth(buffer: Uint8Array) {
    const {value: afid} = parseUint32(buffer, 0);
    const {value: uname, consumed: unameConsumed} = parseString(buffer, 4);
    const {value: aname} = parseString(buffer, 4 + unameConsumed);
    return {
        afid,
        uname,
        aname
    };
}

function parseRauth(buffer: Uint8Array) {
    const {value: qid} = parseQid(buffer, 0);
    return {
        qid
    };
}

function parseTattach(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: afid} = parseUint32(buffer, 4);
    const {value: uname, consumed: unameConsumed} = parseString(buffer, 8);
    const {value: aname} = parseString(buffer, 8 + unameConsumed);
    return {
        fid,
        afid,
        uname,
        aname
    };
}

function parseRattach(buffer: Uint8Array) {
    const {value: qid} = parseQid(buffer, 0);
    return {
        qid
    };
}

function parseRerror(buffer: Uint8Array) {
    const {value: ename} = parseString(buffer, 0);
    return {
        ename
    };
}

function parseTflush(buffer: Uint8Array) {
    const {value: oldtag} = parseUint16(buffer, 0);
    return {
        oldtag
    };
}

function parseEmpty(buffer: Uint8Array) {
    return {};
}

function parseTwalk(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: newfid} = parseUint32(buffer, 4);
    const {value: nwname} = parseUint16(buffer, 8);
    const wnames = [];
    let start = 10;
    for (let i = 0; i < nwname; i++) {
        const {value: wname, consumed: consumed} = parseString(buffer, start);
        wnames.push(wname);
        start += consumed;
    }
    return {
        fid,
        newfid,
        wnames
    };
}

function parseRwalk(buffer: Uint8Array) {
    const {value: nwqid} = parseUint16(buffer, 0);
    const wqids = [];
    let start = 2;
    for (let i = 0; i < nwqid; i++) {
        const {value: wqid, consumed: consumed} = parseQid(buffer, start);
        wqids.push(wqid);
        start += consumed;
    }
    return {
        wqids
    };
}

function parseTopen(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: mode} = parseUint8(buffer, 4);
    return {
        fid,
        mode
    };
}

function parseRopen(buffer: Uint8Array) {
    const {value: qid} = parseQid(buffer, 0);
    const {value: iounit} = parseUint32(buffer, 13);
    return {
        qid,
        iounit
    };
}

function parseTcreate(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: name, consumed: consumed} = parseString(buffer, 4);
    const {value: perm} = parseUint32(buffer, 4 + consumed);
    const {value: mode} = parseUint8(buffer, 8 + consumed);
    return {
        fid,
        name,
        perm,
        mode
    };
}

function parseTread(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: offset} = parseUint64(buffer, 4);
    const {value: count} = parseUint32(buffer, 12);
    return {
        fid,
        offset,
        count
    };
}

function parseRread(buffer: Uint8Array) {
    const {value: data} = parseBuffer(buffer, 0);
    return {
        data
    }
}

function parseTwrite(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: offset} = parseUint64(buffer, 4);
    const {value: data} = parseBuffer(buffer, 12);
    return {
        fid,
        offset,
        data
    }
}

function parseRwrite(buffer: Uint8Array) {
    const {value: count} = parseUint32(buffer, 0);
    return {
        count
    };
}

function parseTclunk(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    return {
        fid
    };
}

function parseRstat(buffer: Uint8Array) {
    const {value: stat} = parseStat(buffer, 0);
    return {
        stat
    };
}

function parseTwstat(buffer: Uint8Array) {
    const {value: fid} = parseUint32(buffer, 0);
    const {value: stat} = parseStat(buffer, 4);
    return {
        fid,
        stat
    };
}

function parseQid(buffer: Uint8Array, start: number) {
    if (buffer.length - start < 13) {
        throw INVALID_EOF;
    }
    return {
        value: new Qid(buffer.slice(start, start + 13)),
        consumed: 13
    };
}

function parseString(buffer: Uint8Array, start: number) {
    const {value: length} = parseUint16(buffer, start);
    if (2 + length > buffer.length - start) {
        throw INVALID_EOF;
    }
    return {
        value: new TextDecoder("utf-8").decode(buffer.slice(start + 2, start + 2 + length)),
        consumed: 2 + length
    };
}

function parseBuffer(buffer: Uint8Array, start: number) {
    const {value: length} = parseUint32(buffer, start);
    if (4 + length > buffer.length - start) {
        throw INVALID_EOF;
    }
    return {
        value: buffer.slice(start + 4, start + 4 + length),
        consumed: 4 + length
    };
}

function parseStat(buffer: Uint8Array, start: number) {
    const {value: size} = parseUint16(buffer, start);
    if (2 + size > buffer.length - start) {
        throw INVALID_EOF;
    }
    const {value: typeField} = parseUint16(buffer, start + 2);
    const {value: dev} = parseUint32(buffer, start + 4);
    const {value: qid} = parseQid(buffer, start + 8);
    const {value: mode} = parseUint32(buffer, start + 21);
    const {value: atime} = parseUint32(buffer, start + 25);
    const {value: mtime} = parseUint32(buffer, start + 29);
    const {value: length} = parseUint64(buffer, start + 33);
    let current = start + 41;
    const {value: name, consumed: nameConsumed} = parseString(buffer, current);
    current += nameConsumed;
    const {value: uid, consumed: uidConsumed} = parseString(buffer, current);
    current += uidConsumed;
    const {value: gid, consumed: gidConsumed} = parseString(buffer, current);
    current += gidConsumed;
    const {value: muid, consumed: muidConsumed} = parseString(buffer, current);
    current += muidConsumed;
    const value: Stat = {
        typeField,
        dev,
        qid,
        mode,
        atime,
        mtime,
        length,
        name,
        uid,
        gid,
        muid
    };
    return {
        value,
        consumed: current - start
    };
}

function parseUint64(buffer: Uint8Array, start: number) {
    if (!ensureSize(buffer, start, 8)) {
        throw INVALID_EOF;
    }
    const view = new DataView(buffer.buffer, start);
    const low: number = view.getUint32(0, true);
    const high: number = view.getUint32(4, true);
    return {
        value: {
            low,
            high
        },
        consumed: 4
    };
}

function parseUint32(buffer: Uint8Array, start: number) {
    if (!ensureSize(buffer, start, 4)) {
        throw INVALID_EOF;
    }
    const value: number = new DataView(buffer.buffer, start).getUint32(0, true);
    return {
        value,
        consumed: 4
    };
}

function parseUint16(buffer: Uint8Array, start: number) {
    if (!ensureSize(buffer, start, 2)) {
        throw INVALID_EOF;
    }
    const value: number = new DataView(buffer.buffer, start).getUint32(0, true);
    return {
        value,
        consumed: 2
    };
}

function parseUint8(buffer: Uint8Array, start: number) {
    if (!ensureSize(buffer, start, 1)) {
        throw INVALID_EOF;
    }
    const value: number = buffer[start];
    return {
        value,
        consumed: 1
    };
}

function ensureSize(buffer: Uint8Array, start: number, length: number) {
    if (start + length > buffer.length) {
        return true;
    }
    return false;
}
