(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global['9p'] = factory());
}(this, (function () { 'use strict';

var consts = {
    TVERSION: 100,
    RVERSION: 101,
    TAUTH: 102,
    RAUTH: 103,
    TATTACH: 104,
    RATTACH: 105,
    RERROR: 107,
    TFLUSH: 108,
    RFLUSH: 109,
    TWALK: 110,
    RWALK: 111,
    TOPEN: 112,
    ROPEN: 113,
    TCREATE: 114,
    RCREATE: 115,
    TREAD: 116,
    RREAD: 117,
    TWRITE: 118,
    RWRITE: 119,
    TCLUNK: 120,
    RCLUNK: 121,
    TREMOVE: 122,
    RREMOVE: 123,
    TSTAT: 124,
    RSTAT: 125,
    TWSTAT: 126,
    RWSTAT: 127,
    NO_TAG: 0xFFFF
};

function stringToUtf8Buffer(s) {
    var str = new TextEncoder("utf-8").encode(s);
    if (str.length > 0xFFFF) {
        str = str.slice(0, 0xFFFF);
    }
    return str;
}
function statToBuffer(s) {
    var nameUtf8 = stringToUtf8Buffer(s.name);
    var uidUtf8 = stringToUtf8Buffer(s.uid);
    var gidUtf8 = stringToUtf8Buffer(s.gid);
    var muidUtf8 = stringToUtf8Buffer(s.muid);
    var length = 49 + nameUtf8.length + uidUtf8.length + gidUtf8.length + muidUtf8.length;
    return new BufferBuilder(length).uint16(length - 2).uint16(s.typeField).
        uint32(s.dev).qid(s.qid).uint32(s.mode).uint32(s.atime).uint32(s.mtime).
        uint64(s.length).stringUtf8(nameUtf8).stringUtf8(uidUtf8).stringUtf8(gidUtf8).
        stringUtf8(muidUtf8).buffer;
}
function messageBuilder(length, t, tag) {
    return new BufferBuilder(length).uint32(length).uint8(t).uint16(tag);
}
var BufferBuilder = /** @class */ (function () {
    function BufferBuilder(length) {
        this.buffer = new Uint8Array(length);
        this.view = new DataView(this.buffer.buffer);
        this.start = 0;
    }
    BufferBuilder.prototype.uint8Array = function (b) {
        this.buffer.set(b, this.start);
        this.start += b.length;
        return this;
    };
    BufferBuilder.prototype.stringUtf8 = function (b) {
        return this.uint16(b.length).uint8Array(b);
    };
    BufferBuilder.prototype.uint8 = function (n) {
        this.view.setUint8(this.start, n);
        this.start += 1;
        return this;
    };
    BufferBuilder.prototype.uint16 = function (n) {
        this.view.setUint16(this.start, n, true);
        this.start += 2;
        return this;
    };
    BufferBuilder.prototype.uint32 = function (n) {
        this.view.setUint32(this.start, n, true);
        this.start += 4;
        return this;
    };
    BufferBuilder.prototype.uint64 = function (n) {
        this.uint32(n.low).uint32(n.high);
        return this;
    };
    BufferBuilder.prototype.qid = function (q) {
        this.uint8Array(q.buffer);
        return this;
    };
    return BufferBuilder;
}());

function concatBuffers(buffers) {
    var length = 0;
    for (var _i = 0, buffers_1 = buffers; _i < buffers_1.length; _i++) {
        var buffer = buffers_1[_i];
        length += buffer.length;
    }
    var result = new Uint8Array(length);
    var offset = 0;
    for (var _a = 0, buffers_2 = buffers; _a < buffers_2.length; _a++) {
        var buffer = buffers_2[_a];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}
// This is just a customized version of EventEmitter, we customize it to our
// needs here hoping to reduce the library size.
var Hub = /** @class */ (function () {
    function Hub() {
        this.bufferedItems = [];
        this.pendingRequests = [];
        this.currentError = null;
    }
    Hub.prototype.item = function (t) {
        var request = this.pendingRequests.shift();
        if (request) {
            request(t, null);
        }
        else {
            this.bufferedItems.push(t);
        }
    };
    Hub.prototype.error = function (error) {
        this.pendingRequests.map(function (r) { return r(null, error); });
        this.pendingRequests = [];
        this.currentError = error;
    };
    Hub.prototype.next = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.currentError) {
                reject(_this.currentError);
                return;
            }
            var item = _this.bufferedItems.shift();
            if (item) {
                resolve(item);
                return;
            }
            _this.pendingRequests.push(function (item, error) {
                if (item) {
                    resolve(item);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    return Hub;
}());

var Encoder = /** @class */ (function () {
    function Encoder(writer) {
        this.writer = writer;
        this.bufferMode = false;
        this.pendingMessages = [];
    }
    Encoder.prototype.buffer = function () {
        this.bufferMode = true;
    };
    Encoder.prototype.flush = function () {
        var buffer;
        if (this.pendingMessages.length === 1) {
            buffer = this.pendingMessages[0];
        }
        else if (this.pendingMessages.length > 1) {
            buffer = concatBuffers(this.pendingMessages);
        }
        if (buffer) {
            this.send(buffer);
        }
        this.bufferMode = false;
        this.pendingMessages = [];
    };
    Encoder.prototype.tversion = function (msize, version) {
        var versionUtf8 = stringToUtf8Buffer(version);
        var length = 13 + versionUtf8.length;
        var buffer = messageBuilder(length, consts.TVERSION, consts.NO_TAG).
            uint32(msize).stringUtf8(versionUtf8).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rversion = function (msize, version) {
        var versionUtf8 = stringToUtf8Buffer(version);
        var length = 13 + versionUtf8.length;
        var buffer = messageBuilder(length, consts.RVERSION, consts.NO_TAG).
            uint32(msize).stringUtf8(versionUtf8).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tauth = function (tag, afid, uname, aname) {
        var unameUtf8 = stringToUtf8Buffer(uname);
        var anameUtf8 = stringToUtf8Buffer(aname);
        var length = 15 + unameUtf8.length + anameUtf8.length;
        var buffer = messageBuilder(length, consts.TAUTH, tag).
            uint32(afid).stringUtf8(unameUtf8).stringUtf8(anameUtf8).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rauth = function (tag, aqid) {
        var buffer = messageBuilder(20, consts.RAUTH, tag).qid(aqid).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tattach = function (tag, fid, afid, uname, aname) {
        var unameUtf8 = stringToUtf8Buffer(uname);
        var anameUtf8 = stringToUtf8Buffer(aname);
        var length = 19 + unameUtf8.length + anameUtf8.length;
        var buffer = messageBuilder(length, consts.TATTACH, tag).
            uint32(fid).uint32(afid).
            stringUtf8(unameUtf8).stringUtf8(anameUtf8).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rattach = function (tag, qid) {
        var buffer = messageBuilder(20, consts.RATTACH, tag).qid(qid).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rerror = function (tag, ename) {
        var enameUtf8 = stringToUtf8Buffer(ename);
        var length = 9 + enameUtf8.length;
        var buffer = messageBuilder(length, consts.RERROR, tag).
            stringUtf8(enameUtf8).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tflush = function (tag, oldtag) {
        var buffer = messageBuilder(9, consts.TFLUSH, tag).uint16(oldtag).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rflush = function (tag) {
        var buffer = messageBuilder(9, consts.RFLUSH, tag).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.twalk = function (tag, fid, newfid, wnames) {
        if (wnames.length > 16) {
            throw new Error("Too many wnames!");
        }
        var wnamesUtf8 = [];
        var totalLength = 0;
        for (var _i = 0, wnames_1 = wnames; _i < wnames_1.length; _i++) {
            var wname = wnames_1[_i];
            var wnameUtf8 = stringToUtf8Buffer(wname);
            wnamesUtf8.push(wnameUtf8);
            totalLength += wnameUtf8.length + 2;
        }
        var length = 17 + totalLength;
        var builder = messageBuilder(length, consts.TWALK, tag).
            uint32(fid).uint32(newfid).uint16(wnamesUtf8.length);
        for (var _a = 0, wnamesUtf8_1 = wnamesUtf8; _a < wnamesUtf8_1.length; _a++) {
            var wnameUtf8 = wnamesUtf8_1[_a];
            builder.stringUtf8(wnameUtf8);
        }
        this.produce(builder.buffer);
    };
    Encoder.prototype.rwalk = function (tag, wqids) {
        if (wqids.length > 16) {
            throw new Error("Too many wqids!");
        }
        var length = 9 + 13 * wqids.length;
        var builder = messageBuilder(length, consts.RWALK, tag);
        for (var _i = 0, wqids_1 = wqids; _i < wqids_1.length; _i++) {
            var wqid = wqids_1[_i];
            builder.qid(wqid);
        }
        this.produce(builder.buffer);
    };
    Encoder.prototype.topen = function (tag, fid, mode) {
        var buffer = messageBuilder(12, consts.TOPEN, tag).
            uint32(fid).uint8(mode).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.ropen = function (tag, qid, iounit) {
        var buffer = messageBuilder(24, consts.ROPEN, tag).
            qid(qid).uint32(iounit).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tcreate = function (tag, fid, name, perm, mode) {
        var nameUtf8 = stringToUtf8Buffer(name);
        var length = 18 + nameUtf8.length;
        var buffer = messageBuilder(length, consts.TCREATE, tag).
            uint32(fid).stringUtf8(nameUtf8).uint32(perm).uint8(mode).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rcreate = function (tag, qid, iounit) {
        var buffer = messageBuilder(24, consts.RCREATE, tag).
            qid(qid).uint32(iounit).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tread = function (tag, fid, offset, count) {
        var buffer = messageBuilder(23, consts.TREAD, tag).
            uint32(fid).uint64(offset).uint32(count).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rread = function (tag, data) {
        var length = 11 + data.length;
        var buffer = messageBuilder(length, consts.RREAD, tag).
            uint32(data.length).uint8Array(data).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.twrite = function (tag, fid, offset, data) {
        var length = 23 + data.length;
        var buffer = messageBuilder(length, consts.TWRITE, tag).
            uint32(fid).uint64(offset).uint32(data.length).uint8Array(data).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rwrite = function (tag, count) {
        var buffer = messageBuilder(11, consts.RWRITE, tag).uint32(count).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tclunk = function (tag, fid) {
        var buffer = messageBuilder(11, consts.TCLUNK, tag).uint32(fid).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rclunk = function (tag) {
        var buffer = messageBuilder(7, consts.RCLUNK, tag).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tremove = function (tag, fid) {
        var buffer = messageBuilder(11, consts.TREMOVE, tag).uint32(fid).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rremove = function (tag) {
        var buffer = messageBuilder(7, consts.RREMOVE, tag).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.tstat = function (tag, fid) {
        var buffer = messageBuilder(11, consts.TSTAT, tag).uint32(fid).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rstat = function (tag, s) {
        var statBuffer = statToBuffer(s);
        var length = 7 + statBuffer.length;
        var buffer = messageBuilder(length, consts.RSTAT, tag).uint8Array(statBuffer).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.twstat = function (tag, fid, s) {
        var statBuffer = statToBuffer(s);
        var length = 11 + statBuffer.length;
        var buffer = messageBuilder(length, consts.TWSTAT, tag).
            uint32(fid).uint8Array(statBuffer).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.rwstat = function (tag) {
        var buffer = messageBuilder(7, consts.RWSTAT, tag).buffer;
        this.produce(buffer);
    };
    Encoder.prototype.produce = function (message) {
        // This way, we are sending messages in the same order as they
        // are generated.
        this.pendingMessages.push(message);
        if (!this.bufferMode) {
            this.flush();
        }
    };
    Encoder.prototype.send = function (buffer) {
        this.writer.write(buffer);
    };
    return Encoder;
}());

var Qid = /** @class */ (function () {
    function Qid(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer.buffer);
    }
    Qid.prototype.type = function () {
        return this.view.getUint8(0);
    };
    Qid.prototype.version = function () {
        return this.view.getUint32(1, true);
    };
    Qid.prototype.path = function () {
        return {
            low: this.view.getUint32(5, true),
            high: this.view.getUint32(9, true)
        };
    };
    return Qid;
}());

var INVALID_EOF = new Error("Invalid EOF!");
function parse(buffer, start) {
    if (!ensureSize(buffer, start, 4)) {
        return {
            message: null,
            consumed: 0
        };
    }
    var len = parseUint32(buffer, start).value;
    // len contains the full message length, including its own 4 bytes
    if (!ensureSize(buffer, start, len)) {
        return {
            message: null,
            consumed: 0
        };
    }
    var t = parseUint8(buffer, start + 4).value;
    var tag = parseUint16(buffer, start + 5).value;
    var parser = PARSERS[t];
    if (!parser) {
        throw new Error("Parser for type " + t + " does not exist!");
    }
    var data = parser(buffer.slice(start + 7, start + len));
    var message = Object.assign({}, data, {
        len: len,
        t: t,
        tag: tag
    });
    return {
        message: message,
        consumed: len
    };
}
var PARSERS = (_a = {}, _a[consts.TVERSION] = parseTversion, _a[consts.RVERSION] = parseTversion, _a[consts.TAUTH] = parseTauth, _a[consts.RAUTH] = parseRauth, _a[consts.TATTACH] = parseTattach, _a[consts.RATTACH] = parseRattach, _a[consts.RERROR] = parseRerror, _a[consts.TFLUSH] = parseTflush, _a[consts.RFLUSH] = parseEmpty, _a[consts.TWALK] = parseTwalk, _a[consts.RWALK] = parseRwalk, _a[consts.TOPEN] = parseTopen, _a[consts.ROPEN] = parseRopen, _a[consts.TCREATE] = parseTcreate, _a[consts.RCREATE] = parseRopen, _a[consts.TREAD] = parseTread, _a[consts.RREAD] = parseRread, _a[consts.TWRITE] = parseTwrite, _a[consts.RWRITE] = parseRwrite, _a[consts.TCLUNK] = parseTclunk, _a[consts.RCLUNK] = parseEmpty, _a[consts.TREMOVE] = parseTclunk, _a[consts.RREMOVE] = parseEmpty, _a[consts.TSTAT] = parseTclunk, _a[consts.RSTAT] = parseRstat, _a[consts.TWSTAT] = parseTwstat, _a[consts.RWSTAT] = parseEmpty, _a);
function parseTversion(buffer) {
    var msize = parseUint32(buffer, 0).value;
    var version = parseString(buffer, 4).value;
    return {
        msize: msize,
        version: version
    };
}
function parseTauth(buffer) {
    var afid = parseUint32(buffer, 0).value;
    var _a = parseString(buffer, 4), uname = _a.value, unameConsumed = _a.consumed;
    var aname = parseString(buffer, 4 + unameConsumed).value;
    return {
        afid: afid,
        uname: uname,
        aname: aname
    };
}
function parseRauth(buffer) {
    var qid = parseQid(buffer, 0).value;
    return {
        qid: qid
    };
}
function parseTattach(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var afid = parseUint32(buffer, 4).value;
    var _a = parseString(buffer, 8), uname = _a.value, unameConsumed = _a.consumed;
    var aname = parseString(buffer, 8 + unameConsumed).value;
    return {
        fid: fid,
        afid: afid,
        uname: uname,
        aname: aname
    };
}
function parseRattach(buffer) {
    var qid = parseQid(buffer, 0).value;
    return {
        qid: qid
    };
}
function parseRerror(buffer) {
    var ename = parseString(buffer, 0).value;
    return {
        ename: ename
    };
}
function parseTflush(buffer) {
    var oldtag = parseUint16(buffer, 0).value;
    return {
        oldtag: oldtag
    };
}
function parseEmpty(buffer) {
    return {};
}
function parseTwalk(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var newfid = parseUint32(buffer, 4).value;
    var nwname = parseUint16(buffer, 8).value;
    var wnames = [];
    var start = 10;
    for (var i = 0; i < nwname; i++) {
        var _a = parseString(buffer, start), wname = _a.value, consumed = _a.consumed;
        wnames.push(wname);
        start += consumed;
    }
    return {
        fid: fid,
        newfid: newfid,
        wnames: wnames
    };
}
function parseRwalk(buffer) {
    var nwqid = parseUint16(buffer, 0).value;
    var wqids = [];
    var start = 2;
    for (var i = 0; i < nwqid; i++) {
        var _a = parseQid(buffer, start), wqid = _a.value, consumed = _a.consumed;
        wqids.push(wqid);
        start += consumed;
    }
    return {
        wqids: wqids
    };
}
function parseTopen(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var mode = parseUint8(buffer, 4).value;
    return {
        fid: fid,
        mode: mode
    };
}
function parseRopen(buffer) {
    var qid = parseQid(buffer, 0).value;
    var iounit = parseUint32(buffer, 13).value;
    return {
        qid: qid,
        iounit: iounit
    };
}
function parseTcreate(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var _a = parseString(buffer, 4), name = _a.value, consumed = _a.consumed;
    var perm = parseUint32(buffer, 4 + consumed).value;
    var mode = parseUint8(buffer, 8 + consumed).value;
    return {
        fid: fid,
        name: name,
        perm: perm,
        mode: mode
    };
}
function parseTread(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var offset = parseUint64(buffer, 4).value;
    var count = parseUint32(buffer, 12).value;
    return {
        fid: fid,
        offset: offset,
        count: count
    };
}
function parseRread(buffer) {
    var data = parseBuffer(buffer, 0).value;
    return {
        data: data
    };
}
function parseTwrite(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var offset = parseUint64(buffer, 4).value;
    var data = parseBuffer(buffer, 12).value;
    return {
        fid: fid,
        offset: offset,
        data: data
    };
}
function parseRwrite(buffer) {
    var count = parseUint32(buffer, 0).value;
    return {
        count: count
    };
}
function parseTclunk(buffer) {
    var fid = parseUint32(buffer, 0).value;
    return {
        fid: fid
    };
}
function parseRstat(buffer) {
    var stat = parseStat(buffer, 0).value;
    return {
        stat: stat
    };
}
function parseTwstat(buffer) {
    var fid = parseUint32(buffer, 0).value;
    var stat = parseStat(buffer, 4).value;
    return {
        fid: fid,
        stat: stat
    };
}
function parseQid(buffer, start) {
    if (buffer.length - start < 13) {
        throw INVALID_EOF;
    }
    return {
        value: new Qid(buffer.slice(start, start + 13)),
        consumed: 13
    };
}
function parseString(buffer, start) {
    var length = parseUint16(buffer, start).value;
    if (2 + length > buffer.length - start) {
        throw INVALID_EOF;
    }
    return {
        value: new TextDecoder("utf-8").decode(buffer.slice(start + 2, start + 2 + length)),
        consumed: 2 + length
    };
}
function parseBuffer(buffer, start) {
    var length = parseUint32(buffer, start).value;
    if (4 + length > buffer.length - start) {
        throw INVALID_EOF;
    }
    return {
        value: buffer.slice(start + 4, start + 4 + length),
        consumed: 4 + length
    };
}
function parseStat(buffer, start) {
    var size = parseUint16(buffer, start).value;
    if (2 + size > buffer.length - start) {
        throw INVALID_EOF;
    }
    var typeField = parseUint16(buffer, start + 2).value;
    var dev = parseUint32(buffer, start + 4).value;
    var qid = parseQid(buffer, start + 8).value;
    var mode = parseUint32(buffer, start + 21).value;
    var atime = parseUint32(buffer, start + 25).value;
    var mtime = parseUint32(buffer, start + 29).value;
    var length = parseUint64(buffer, start + 33).value;
    var current = start + 41;
    var _a = parseString(buffer, current), name = _a.value, nameConsumed = _a.consumed;
    current += nameConsumed;
    var _b = parseString(buffer, current), uid = _b.value, uidConsumed = _b.consumed;
    current += uidConsumed;
    var _c = parseString(buffer, current), gid = _c.value, gidConsumed = _c.consumed;
    current += gidConsumed;
    var _d = parseString(buffer, current), muid = _d.value, muidConsumed = _d.consumed;
    current += muidConsumed;
    var value = {
        typeField: typeField,
        dev: dev,
        qid: qid,
        mode: mode,
        atime: atime,
        mtime: mtime,
        length: length,
        name: name,
        uid: uid,
        gid: gid,
        muid: muid
    };
    return {
        value: value,
        consumed: current - start
    };
}
function parseUint64(buffer, start) {
    if (!ensureSize(buffer, start, 8)) {
        throw INVALID_EOF;
    }
    var view = new DataView(buffer.buffer, start);
    var low = view.getUint32(0, true);
    var high = view.getUint32(4, true);
    return {
        value: {
            low: low,
            high: high
        },
        consumed: 4
    };
}
function parseUint32(buffer, start) {
    if (!ensureSize(buffer, start, 4)) {
        throw INVALID_EOF;
    }
    var value = new DataView(buffer.buffer, start).getUint32(0, true);
    return {
        value: value,
        consumed: 4
    };
}
function parseUint16(buffer, start) {
    if (!ensureSize(buffer, start, 2)) {
        throw INVALID_EOF;
    }
    var value = new DataView(buffer.buffer, start).getUint32(0, true);
    return {
        value: value,
        consumed: 2
    };
}
function parseUint8(buffer, start) {
    if (!ensureSize(buffer, start, 1)) {
        throw INVALID_EOF;
    }
    var value = buffer[start];
    return {
        value: value,
        consumed: 1
    };
}
function ensureSize(buffer, start, length) {
    if (start + length > buffer.length) {
        return true;
    }
    return false;
}
var _a;

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Decoder = /** @class */ (function () {
    function Decoder(reader) {
        this.reset(reader);
        this.read();
    }
    Decoder.prototype.reset = function (reader) {
        this.reader = reader;
        this.buffer = new Uint8Array(0);
        this.hub = new Hub();
    };
    Decoder.prototype.read = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentReader, data, newBuffer, start, _a, message, consumed, result, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        currentReader = this.reader;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.reader.read()];
                    case 2:
                        data = _b.sent();
                        // In case of reset, we might have a different reader here, in
                        // that case we want to re-trigger the read call
                        if (currentReader === this.reader) {
                            newBuffer = concatBuffers([this.buffer, data]);
                            start = 0;
                            _a = parse(newBuffer, start), message = _a.message, consumed = _a.consumed;
                            while (message !== null) {
                                this.hub.item(message);
                                start += consumed;
                                result = parse(newBuffer, start);
                                message = result.message;
                                consumed = result.consumed;
                            }
                            // Keep remaining partial data here
                            this.buffer = newBuffer.slice(start);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _b.sent();
                        this.hub.error(e_1);
                        return [3 /*break*/, 4];
                    case 4:
                        setTimeout(this.read, 1);
                        return [2 /*return*/];
                }
            });
        });
    };
    Decoder.prototype.next = function () {
        return this.hub.next();
    };
    return Decoder;
}());

var WebSocketReadWriter = /** @class */ (function () {
    function WebSocketReadWriter(url) {
        var _this = this;
        this.hub = new Hub();
        this.socket = new WebSocket(url, [ "binary" ]);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = function (message) {
            _this.hub.item(new Uint8Array(message.data));
        };
        this.socket.onerror = this.socket.onclose = function () {
            _this.hub.error(new Error("Socket closed"));
        };
    }
    WebSocketReadWriter.prototype.read = function () {
        return this.hub.next();
    };

    WebSocketReadWriter.prototype.write = function (data) {
				this.socket.send(data);
    };

    return WebSocketReadWriter;
}());

var library = {
    Decoder: Decoder,
    Encoder: Encoder,
    consts: consts,
    Qid: Qid,
    WebSocketReadWriter: WebSocketReadWriter
};

return library;

})));
