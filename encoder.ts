import {Writer} from "./io";
import consts from "./consts";
import Stat from "./stat";
import Qid from "./qid";
import {stringToUtf8Buffer,
        statToBuffer,
        messageBuilder} from "./packer";
import {concatBuffers, Uint64} from "./misc";

export default class Encoder {
    private writer: Writer;
    private bufferMode: boolean;
    private pendingMessages: Array<Uint8Array>;

    constructor(writer: Writer) {
        this.writer = writer;
        this.bufferMode = false;
        this.pendingMessages = [];
    }

    buffer() {
        this.bufferMode = true;
    }

    flush() {
        let buffer;
        if (this.pendingMessages.length === 1) {
            buffer = this.pendingMessages[0]
        } else if (this.pendingMessages.length > 1) {
            buffer = concatBuffers(this.pendingMessages);
        }
        if (buffer) {
            this.send(buffer);
        }
        this.bufferMode = false;
        this.pendingMessages = [];
    }

    tversion(msize: number, version: string) {
        const versionUtf8 = stringToUtf8Buffer(version);
        const length = 13 + versionUtf8.length;
        const buffer = messageBuilder(length, consts.TVERSION, consts.NO_TAG).
            uint32(msize).stringUtf8(versionUtf8).buffer;
        this.produce(buffer);
    }

    rversion(msize: number, version: string) {
        const versionUtf8 = stringToUtf8Buffer(version);
        const length = 13 + versionUtf8.length;
        const buffer = messageBuilder(length, consts.RVERSION, consts.NO_TAG).
            uint32(msize).stringUtf8(versionUtf8).buffer;
        this.produce(buffer);
    }

    tauth(tag: number, afid: number, uname: string, aname: string) {
        const unameUtf8 = stringToUtf8Buffer(uname);
        const anameUtf8 = stringToUtf8Buffer(aname);
        const length = 15 + unameUtf8.length + anameUtf8.length;
        const buffer = messageBuilder(length, consts.TAUTH, tag).
            uint32(afid).stringUtf8(unameUtf8).stringUtf8(anameUtf8).buffer;
        this.produce(buffer);
    }

    rauth(tag: number, aqid: Qid) {
        const buffer = messageBuilder(20, consts.RAUTH, tag).qid(aqid).buffer;
        this.produce(buffer);
    }

    tattach(tag: number, fid: number, afid: number, uname: string, aname: string) {
        const unameUtf8 = stringToUtf8Buffer(uname);
        const anameUtf8 = stringToUtf8Buffer(aname);
        const length = 19 + unameUtf8.length + anameUtf8.length;
        const buffer = messageBuilder(length, consts.TATTACH, tag).
            uint32(fid).uint32(afid).
            stringUtf8(unameUtf8).stringUtf8(anameUtf8).buffer;
        this.produce(buffer);
    }

    rattach(tag: number, qid: Qid) {
        const buffer = messageBuilder(20, consts.RATTACH, tag).qid(qid).buffer;
        this.produce(buffer);
    }

    rerror(tag: number, ename: string) {
        const enameUtf8 = stringToUtf8Buffer(ename);
        const length = 9 + enameUtf8.length;
        const buffer = messageBuilder(length, consts.RERROR, tag).
            stringUtf8(enameUtf8).buffer;
        this.produce(buffer);
    }

    tflush(tag: number, oldtag: number) {
        const buffer = messageBuilder(9, consts.TFLUSH, tag).uint16(oldtag).buffer;
        this.produce(buffer);
    }

    rflush(tag: number) {
        const buffer = messageBuilder(9, consts.RFLUSH, tag).buffer;
        this.produce(buffer);
    }

    twalk(tag: number, fid: number, newfid: number, wnames: Array<string>) {
        if (wnames.length > 16) {
            throw new Error("Too many wnames!");
        }
        const wnamesUtf8 = [];
        let totalLength = 0;
        for (let wname of wnames) {
            const wnameUtf8 = stringToUtf8Buffer(wname);
            wnamesUtf8.push(wnameUtf8);
            totalLength += wnameUtf8.length + 2;
        }
        const length = 17 + totalLength;
        const builder = messageBuilder(length, consts.TWALK, tag).
            uint32(fid).uint32(newfid).uint16(wnamesUtf8.length);
        for (let wnameUtf8 of wnamesUtf8) {
            builder.stringUtf8(wnameUtf8);
        }
        this.produce(builder.buffer);
    }

    rwalk(tag: number, wqids: Array<Qid>) {
        if (wqids.length > 16) {
            throw new Error("Too many wqids!");
        }
        const length = 9 + 13 * wqids.length;
        const builder = messageBuilder(length, consts.RWALK, tag);
        for (let wqid of wqids) {
            builder.qid(wqid);
        }
        this.produce(builder.buffer);
    }

    topen(tag: number, fid: number, mode: number) {
        const buffer = messageBuilder(12, consts.TOPEN, tag).
            uint32(fid).uint8(mode).buffer;
        this.produce(buffer);
    }

    ropen(tag: number, qid: Qid, iounit: number) {
        const buffer = messageBuilder(24, consts.ROPEN, tag).
            qid(qid).uint32(iounit).buffer;
        this.produce(buffer);
    }

    tcreate(tag: number, fid: number, name: string, perm: number, mode: number) {
        const nameUtf8 = stringToUtf8Buffer(name);
        const length = 18 + nameUtf8.length;
        const buffer = messageBuilder(length, consts.TCREATE, tag).
            uint32(fid).stringUtf8(nameUtf8).uint32(perm).uint8(mode).buffer;
        this.produce(buffer);
    }

    rcreate(tag: number, qid: Qid, iounit: number) {
        const buffer = messageBuilder(24, consts.RCREATE, tag).
            qid(qid).uint32(iounit).buffer;
        this.produce(buffer);
    }

    tread(tag: number, fid: number, offset: Uint64, count: number) {
        const buffer = messageBuilder(23, consts.TREAD, tag).
            uint32(fid).uint64(offset).uint32(count).buffer;
        this.produce(buffer);
    }

    rread(tag: number, data: Uint8Array) {
        const length = 11 + data.length;
        const buffer = messageBuilder(length, consts.RREAD, tag).
            uint32(data.length).uint8Array(data).buffer;
        this.produce(buffer);
    }

    twrite(tag: number, fid: number, offset: Uint64, data: Uint8Array) {
        const length = 23 + data.length;
        const buffer = messageBuilder(length, consts.TWRITE, tag).
            uint32(fid).uint64(offset).uint32(data.length).uint8Array(data).buffer;
        this.produce(buffer);
    }

    rwrite(tag: number, count: number) {
        const buffer = messageBuilder(11, consts.RWRITE, tag).uint32(count).buffer;
        this.produce(buffer);
    }

    tclunk(tag: number, fid: number) {
        const buffer = messageBuilder(11, consts.TCLUNK, tag).uint32(fid).buffer;
        this.produce(buffer);
    }

    rclunk(tag: number) {
        const buffer = messageBuilder(7, consts.RCLUNK, tag).buffer;
        this.produce(buffer);
    }

    tremove(tag: number, fid: number) {
        const buffer = messageBuilder(11, consts.TREMOVE, tag).uint32(fid).buffer;
        this.produce(buffer);
    }

    rremove(tag: number) {
        const buffer = messageBuilder(7, consts.RREMOVE, tag).buffer;
        this.produce(buffer);
    }

    tstat(tag: number, fid: number) {
        const buffer = messageBuilder(11, consts.TSTAT, tag).uint32(fid).buffer;
        this.produce(buffer);
    }

    rstat(tag: number, s: Stat) {
        const statBuffer = statToBuffer(s);
        const length = 7 + statBuffer.length;
        const buffer = messageBuilder(length, consts.RSTAT, tag).uint8Array(statBuffer).buffer;
        this.produce(buffer);
    }

    twstat(tag: number, fid: number, s: Stat) {
        const statBuffer = statToBuffer(s);
        const length = 11 + statBuffer.length;
        const buffer = messageBuilder(length, consts.TWSTAT, tag).
            uint32(fid).uint8Array(statBuffer).buffer;
        this.produce(buffer);
    }

    rwstat(tag: number) {
        const buffer = messageBuilder(7, consts.RWSTAT, tag).buffer;
        this.produce(buffer);
    }

    private produce(message: Uint8Array) {
        // This way, we are sending messages in the same order as they
        // are generated.
        this.pendingMessages.push(message);
        if (!this.bufferMode) {
            this.flush();
        }
    }

    private send(buffer: Uint8Array) {
        this.writer.write(buffer);
    }
}
