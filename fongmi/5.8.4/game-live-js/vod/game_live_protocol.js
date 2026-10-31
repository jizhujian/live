const encoder = new TextEncoder();
const decoder = new TextDecoder();
const douyuColors = [0xffffff, 0xff2e2e, 0x00ccff, 0x66ff00, 0xff6600, 0xcc00ff, 0xf6447f];
const yyEntities = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'"};

export function subscribe(platform, room, emit) {
    const instance = platform === "yy" ? crypto.randomUUID() : undefined;
    const url = platform === "douyu" ? "wss://danmuproxy.douyu.com:8506/" : platform === "huya" ? "wss://cdnws.api.huya.com/" : platform === "yy" ? `wss://h5-sinchl.yy.com/websocket?appid=yymwebh5&version=3.2.14&uuid=${instance}` : "";
    if (!url) throw new Error("不支援的彈幕平台");
    let decode;
    let yy;
    let socket;
    let heartbeat;
    let stopped = false;
    let ready = false;

    function stop() {
        if (stopped) return;
        stopped = true;
        clearHeartbeat();
        clearDecoder();
        socket?.cancel();
    }

    function clearHeartbeat() {
        clearInterval(heartbeat);
        heartbeat = undefined;
    }

    function clearDecoder() {
        yy?.clear();
        yy = undefined;
        decode = undefined;
    }

    function send(connection, data) {
        if (connection.send(data)) return true;
        clearHeartbeat();
        return false;
    }

    function pulse(connection) {
        if (platform === "yy") return yy?.pulse() ?? false;
        return send(connection, platform === "douyu" ? douyuPacket("type@=mrkl/") : new Uint8Array([0, 20, 29, 0, 12]));
    }

    function beat(connection) {
        if (stopped) return;
        try {
            pulse(connection);
        } catch (error) {
            fail(error);
        }
    }

    function open(connection) {
        clearHeartbeat();
        clearDecoder();
        ready = false;
        if (platform === "yy") {
            yy = yySession(room, data => send(connection, data), markReady, instance);
            decode = yy.decode;
            if (yy.start()) heartbeat = setInterval(() => beat(connection), 5000);
            return;
        }
        decode = platform === "douyu" ? douyuDecoder(markReady) : data => huyaMessages(data, markReady);
        if (platform === "douyu") {
            if (!send(connection, douyuPacket(`type@=loginreq/roomid@=${room.id}/`))) return;
            if (!send(connection, douyuPacket(`type@=joingroup/rid@=${room.id}/gid@=-9999/`))) return;
        } else if (!send(connection, huyaLogin(room))) {
            return;
        }
        if (pulse(connection)) heartbeat = setInterval(() => beat(connection), 30000);
    }

    function markReady() {
        if (ready) return;
        ready = true;
        emit({state: "ready"});
    }

    function fail(error) {
        if (stopped) return;
        stop();
        emit({state: "error", msg: String(error?.message || error || "彈幕連線已關閉").slice(0, 512)});
    }

    function receive(connection, event) {
        if (stopped) return;
        try {
            if (event.type === "open") {
                open(connection);
            } else if (event.type === "message" && event.binary) {
                for (const item of decode(event.content)) {
                    if (stopped) return;
                    emit(item);
                }
            } else if (event.type === "retry") {
                clearHeartbeat();
                clearDecoder();
                ready = false;
                emit({state: "retrying", msg: "彈幕連線中斷，等待恢復"});
                if (event.error) console.error(`${platform} 彈幕重連：${event.error}`);
            } else if (event.type === "error" || event.type === "close") {
                fail(event.error || "彈幕連線已關閉");
                if (event.type === "error") console.error(`${platform} 彈幕：${event.error}`);
            }
        } catch (error) {
            fail(error);
            throw error;
        }
    }

    const options = {timeout: 10000, idle: 90000, reconnect: true};
    if (platform === "yy") options.headers = {Origin: "https://www.yy.com"};
    socket = net.connect(url, options, receive);
    if (stopped) socket.cancel();
    return stop;
}

export function douyuPacket(text) {
    const body = encoder.encode(text + "\0");
    const packet = new Uint8Array(12 + body.length);
    const view = new DataView(packet.buffer);
    view.setUint32(0, body.length + 8, true);
    view.setUint32(4, body.length + 8, true);
    view.setUint32(8, 689, true);
    packet.set(body, 12);
    return packet;
}

function yyBytes(...parts) {
    const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}

function yyNumber(value, size = 4) {
    let number = BigInt.asUintN(size * 8, BigInt(value));
    const result = new Uint8Array(size);
    for (let index = 0; index < size; index++) {
        result[index] = Number(number & 255n);
        number >>= 8n;
    }
    return result;
}

function yyBlob(data, size = 2) {
    return yyBytes(yyNumber(data.length, size), data);
}

function yyString(value) {
    return yyBlob(encoder.encode(value));
}

function yyPacket(uri, ...parts) {
    const body = yyBytes(...parts);
    return yyBytes(yyNumber(body.length + 10), yyNumber(uri), yyNumber(200, 2), body);
}

function yyReader(data) {
    let offset = 0;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const reader = {
        remaining: () => data.length - offset,
        read(size) {
            if (!Number.isInteger(size) || size < 0 || size > data.length - offset) throw new Error("YY 彈幕封包不完整");
            const result = data.subarray(offset, offset + size);
            offset += size;
            return result;
        },
        number(size = 4) {
            reader.read(size);
            if (size === 1) return view.getUint8(offset - 1);
            if (size === 2) return view.getUint16(offset - 2, true);
            if (size === 4) return view.getUint32(offset - 4, true);
            return BigInt(view.getUint32(offset - 8, true)) | BigInt(view.getUint32(offset - 4, true)) << 32n;
        },
        blob(size = 2) {
            return reader.read(reader.number(size));
        },
        string() {
            return decoder.decode(reader.blob());
        },
        wide() {
            const bytes = reader.blob(4);
            if (bytes.length % 2) throw new Error("YY 彈幕文字格式錯誤");
            let result = "";
            for (let index = 0; index < bytes.length; index += 2) {
                const character = bytes[index] | bytes[index + 1] << 8;
                if (character >= 0xd800 && character <= 0xdbff) {
                    const next = bytes[index + 2] | bytes[index + 3] << 8;
                    if (index + 3 >= bytes.length || next < 0xdc00 || next > 0xdfff) throw new Error("YY 彈幕文字格式錯誤");
                    result += String.fromCharCode(character, next);
                    index += 2;
                } else {
                    if (character >= 0xdc00 && character <= 0xdfff) throw new Error("YY 彈幕文字格式錯誤");
                    result += String.fromCharCode(character);
                }
            }
            return result;
        }
    };
    return reader;
}

function yyUnescape(text) {
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(text) || /&(?!(?:#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);)/.test(text)) throw new Error("YY 彈幕文字實體錯誤");
    return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (entity, name) => {
        if (name[0] !== "#") return yyEntities[name];
        const number = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        if (number < 0x20 && ![9, 10, 13].includes(number) || number > 0x10ffff || number >= 0xd800 && number <= 0xdfff || number === 0xfffe || number === 0xffff) throw new Error("YY 彈幕文字實體錯誤");
        return String.fromCodePoint(number);
    });
}

function yyAttributes(source) {
    const attributes = Object.create(null);
    while (source.trim()) {
        const match = source.match(/^\s+([A-Za-z_:][\w:.-]*)\s*=\s*(["'])([\s\S]*?)\2/);
        if (!match || Object.hasOwn(attributes, match[1])) throw new Error("YY 彈幕文字格式錯誤");
        attributes[match[1]] = yyUnescape(match[3]);
        source = source.slice(match[0].length);
    }
    return attributes;
}

function yyText(value) {
    if (!/^\s*</.test(value)) return value;
    if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error("YY 彈幕文字格式錯誤");
    const parts = [];
    const stack = [];
    let offset = 0;
    let root = false;
    for (const match of value.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:[^<>"']|"[^"<]*"|'[^'<]*')*>/g)) {
        const gap = value.slice(offset, match.index);
        if (gap.includes("<") || !stack.length && gap.trim()) throw new Error("YY 彈幕文字格式錯誤");
        yyUnescape(gap);
        offset = match.index + match[0].length;
        const token = match[0];
        if (token.startsWith("<!--")) continue;
        if (token.startsWith("<?")) {
            if (root || !/^<\?xml\s[\s\S]*\?>$/.test(token)) throw new Error("YY 彈幕文字格式錯誤");
            continue;
        }
        const tag = token.match(/^<(\/?)([A-Za-z_][\w:.-]*)([\s\S]*?)(\/?)>$/);
        if (tag[1]) {
            if (tag[3].trim() || tag[4] || stack.pop() !== tag[2]) throw new Error("YY 彈幕文字格式錯誤");
            continue;
        }
        if (!stack.length) {
            if (root) throw new Error("YY 彈幕文字格式錯誤");
            root = true;
        }
        const attributes = yyAttributes(tag[3]);
        if (tag[2] === "txt" && Object.hasOwn(attributes, "data")) parts.push(attributes.data);
        if (stack.length >= 20) throw new Error("YY 彈幕文字層數過多");
        if (!tag[4]) stack.push(tag[2]);
    }
    if (!root || stack.length || value.slice(offset).trim()) throw new Error("YY 彈幕文字格式錯誤");
    return parts.join("");
}

export function yySession(room, send, onReady, instance = crypto.randomUUID()) {
    const top = Number(room.top);
    const sub = Number(room.sub);
    if (![top, sub].every(value => Number.isInteger(value) && value > 0 && value <= 0xffffffff)) throw new Error("YY 彈幕房間無效");
    let uid = 0n;
    let stage = "closed";
    let pending;

    function transmit(uri, ...parts) {
        if (stage === "closed") return false;
        if (send(yyPacket(uri, ...parts))) return true;
        clear();
        return false;
    }

    function clear() {
        uid = 0n;
        stage = "closed";
        pending = undefined;
    }

    function start() {
        clear();
        stage = "guest";
        const machine = yyString("B8-97-5A-17-AD-4D");
        const guest = yyBytes(yyString(""), yyNumber(0), machine, machine, yyNumber(0), yyString("yymwebh5"));
        return transmit(778244, yyString(""), yyNumber(19822), yyBlob(guest, 4));
    }

    function login(reader) {
        reader.string();
        const result = reader.number();
        if (result !== 200 || reader.number() !== 20078) throw new Error("YY 彈幕訪客登入失敗");
        const guest = yyReader(reader.blob(4));
        guest.string();
        if (![0, 200].includes(guest.number())) throw new Error("YY 彈幕訪客登入失敗");
        const legacy = guest.number();
        guest.number();
        const account = guest.string();
        const password = guest.string();
        const cookie = guest.blob();
        guest.blob();
        guest.string();
        guest.string();
        uid = guest.remaining() ? guest.number(8) || BigInt(legacy) : BigInt(legacy);
        if (!uid || !account || !password || !cookie.length) throw new Error("YY 彈幕訪客資料無效");
        const auth = yyBytes(yyString(account), yyString(password), yyNumber(2), yyNumber(0), yyNumber(0), yyString("yytianlaitv"), yyString("B8-97-5A-17-AD-4D"), yyString("yymwebn_yymwebh5"), yyNumber(0), yyNumber(0), yyNumber(0), yyNumber(0), yyString(instance));
        stage = "ap";
        transmit(775684, yyBlob(auth, 4), yyNumber(259), yyNumber(uid, 8), yyNumber(0, 1), yyBlob(new Uint8Array()), yyBlob(cookie), yyString("259:0"), yyString(""), yyString(""), yyString(""), yyNumber(0, 1), yyNumber(0), yyNumber(0), yyNumber(-1), yyString(""), yyNumber(1), yyString("BCIFVer"), yyString("V2"));
    }

    function join() {
        const uri = 2048258;
        const service = "channelAuther";
        const trace = `F${uid}_yymwebh5_${Date.now()}_1`;
        const ext = yyBytes(yyNumber(2), yyNumber(1), yyBlob(yyNumber(top)), yyNumber(103), yyString(trace));
        const headers = yyBytes(yyNumber(0x01000008), yyNumber(uri), yyNumber(0x02000010), yyNumber(259), yyNumber(uid, 8), yyNumber(0x0400000c), yyNumber(0), yyNumber(0), yyNumber(0x05000008), yyNumber(0), yyNumber(0x06000000 | 22 + service.length), yyNumber(0), yyNumber(0, 2), yyNumber(0), yyString(service), yyNumber(0), yyString(""), yyNumber(0x07000000 | 4 + ext.length), ext, yyNumber(0x08000006), yyString(""), yyNumber(4286085240));
        const payload = yyBytes(yyNumber(uid), yyNumber(top), yyNumber(sub), yyNumber(0), yyNumber(uid, 8));
        if (transmit(538456, yyNumber(uid, 8), yyNumber(1), yyNumber(31))) transmit(513035, yyString(""), yyNumber(uri), yyNumber(0, 2), yyBlob(payload, 4), yyBlob(headers, 4));
    }

    function groups(entries) {
        return transmit(537944, yyNumber(uid, 8), yyNumber(entries.length), ...entries.flatMap(entry => entry.map(value => yyNumber(value))), yyString(""));
    }

    function channel(reader) {
        reader.string();
        const uri = reader.number();
        const code = reader.number(2);
        const data = reader.blob(4);
        if (uri !== 2048514 || stage !== "join") return;
        if (code !== 200) throw new Error("YY 彈幕進入頻道失敗");
        const result = yyReader(data);
        const actualTop = result.number();
        result.number();
        const actualSub = result.number();
        result.number();
        result.number();
        const status = result.number(1);
        result.string();
        if (status !== 4 || actualTop !== top || actualSub !== sub) throw new Error("YY 彈幕頻道訂閱失敗");
        if (!groups([[1, 0, top, 0], [2, 0, sub, 0], [1024, 259, sub, top], [768, 259, 0, top], [256, 259, 0, top], [256, 259, sub, top]])) return;
        if (!groups([[1, 0, top, 0], [2, 0, sub, 0]])) return;
        stage = "subscribed";
        onReady?.();
    }

    function chat(uri, reader) {
        let appid;
        let data;
        if (uri === 533080) {
            reader.number(8);
            reader.number(8);
            appid = reader.number();
            data = reader.blob(4);
        } else {
            appid = reader.number(2);
            reader.number();
            data = reader.blob();
        }
        if (appid !== 31) return [];
        const packet = yyReader(data);
        if (packet.number() !== data.length) throw new Error("YY 彈幕訊息長度錯誤");
        const type = packet.number();
        if (type !== 3104600) return [];
        if (packet.number(2) !== 200) throw new Error("YY 彈幕訊息狀態錯誤");
        packet.number();
        const actualTop = packet.number();
        const actualSub = packet.number();
        if (actualTop !== top || actualSub !== sub) return [];
        const format = yyReader(packet.blob());
        format.number();
        format.wide();
        const color = format.number();
        format.number();
        const text = yyText(format.wide());
        format.number();
        if (!text.trim()) return [];
        return [{text, color: isRgb(color) && color !== 0 ? color : 0xffffff}];
    }

    function dispatch(uri, reader, code) {
        if (uri === 795140) throw new Error("YY 彈幕連線被關閉");
        if (uri === 778500 && stage === "guest") login(reader);
        else if (uri === 775940 && stage === "ap") {
            reader.number();
            if (reader.number() !== 200 || reader.string() !== "259:0") throw new Error("YY 彈幕服務登入失敗");
            stage = "join";
            join();
        } else if (uri === 512011) channel(reader);
        else if (stage === "subscribed" && (uri === 533080 || uri === 28760)) {
            if (code !== 200) throw new Error("YY 彈幕聊天封包狀態錯誤");
            return chat(uri, reader);
        }
        return [];
    }

    function decode(chunk) {
        if (stage === "closed") return [];
        if (!(chunk instanceof Uint8Array) || chunk.length + (pending?.length || 0) > 1048576) throw new Error("YY 彈幕封包過大");
        const data = pending ? yyBytes(pending, chunk) : chunk;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const messages = [];
        let offset = 0;
        while (offset + 10 <= data.length) {
            const size = view.getUint32(offset, true);
            if (size < 10 || size > 1048576) throw new Error("YY 彈幕封包長度錯誤");
            if (offset + size > data.length) break;
            const uri = view.getUint32(offset + 4, true);
            if ([778500, 775940, 512011].includes(uri) && view.getUint16(offset + 8, true) !== 200) throw new Error("YY 彈幕服務回應失敗");
            messages.push(...dispatch(uri, yyReader(data.subarray(offset + 10, offset + size)), view.getUint16(offset + 8, true)));
            offset += size;
            if (stage === "closed") return messages;
        }
        pending = offset < data.length ? data.slice(offset) : undefined;
        return messages;
    }

    function pulse() {
        return stage === "closed" ? false : stage === "guest" || stage === "ap" || transmit(794116, yyNumber(0));
    }

    return {start, decode, pulse, clear};
}

export function douyuDecoder(onReady) {
    let pending;
    return chunk => {
        const size = (pending?.length || 0) + chunk.length;
        if (size > 1048576) throw new Error("斗魚彈幕封包過大");
        let data = chunk;
        if (pending) {
            data = new Uint8Array(size);
            data.set(pending);
            data.set(chunk, pending.length);
        }
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const messages = [];
        let offset = 0;
        while (offset + 12 <= data.length) {
            const length = view.getUint32(offset, true);
            if (length < 9 || length > 1048572 || length !== view.getUint32(offset + 4, true)) throw new Error("斗魚彈幕封包格式錯誤");
            const end = offset + length + 4;
            if (end > data.length) break;
            if (data[end - 1] !== 0) throw new Error("斗魚彈幕封包缺少結尾");
            const fields = Object.create(null);
            for (const item of decoder.decode(data.subarray(offset + 12, end - 1)).split("/")) {
                const index = item.indexOf("@=");
                if (index >= 0) fields[item.slice(0, index)] = item.slice(index + 2).replaceAll("@S", "/").replaceAll("@A", "@");
            }
            if (fields.type === "mrkl" || fields.type === "chatmsg") onReady?.();
            if (fields.type === "chatmsg" && fields.txt?.trim()) messages.push({text: fields.txt, color: douyuColor(fields.col)});
            offset = end;
        }
        pending = offset < data.length ? data.slice(offset) : undefined;
        return messages;
    };
}

function douyuColor(value = "") {
    const color = value.replace(/^0+/, "");
    return color.length === 1 && "123456".includes(color) ? douyuColors[Number(color)] : 0xffffff;
}

function encodeInteger(tag, value) {
    let number = BigInt(value);
    if (number === 0n) return [tag << 4 | 12];
    const size = number >= -128n && number <= 127n ? 1 : number >= -32768n && number <= 32767n ? 2 : number >= -2147483648n && number <= 2147483647n ? 4 : 8;
    const result = [tag << 4 | (size === 1 ? 0 : size === 2 ? 1 : size === 4 ? 2 : 3)];
    number = BigInt.asUintN(size * 8, number);
    for (let index = size - 1; index >= 0; index--) result.push(Number(number >> BigInt(index * 8) & 255n));
    return result;
}

export function huyaLogin(room) {
    const body = [...encodeInteger(0, room.uid), ...encodeInteger(1, 1), 0x26, 0, 0x36, 0,
        ...encodeInteger(4, room.top), ...encodeInteger(5, room.sub), ...encodeInteger(6, 0), ...encodeInteger(7, 0)];
    return new Uint8Array([...encodeInteger(0, 1), 0x1d, 0, ...encodeInteger(0, body.length), ...body]);
}

export function huyaMessages(data, onReady) {
    const envelope = tars(data);
    if (envelope[0] === 2) {
        if (tars(envelope[1])[0] !== 0) throw new Error("虎牙彈幕訂閱失敗");
        onReady?.();
        return [];
    }
    if (envelope[0] !== 7) return [];
    const push = tars(envelope[1]);
    if (push[1] !== 1400) return [];
    const message = tars(push[2]);
    if (typeof message[3] !== "string" || !message[3].trim()) return [];
    onReady?.();
    const format = message[6];
    const colors = Array.isArray(format?.[6]) ? format[6].filter(isRgb).slice(0, 8) : [];
    const item = {text: message[3], color: colors[0] ?? (isRgb(format?.[0]) ? format[0] : 0xffffff)};
    if (colors.length > 1) item.colors = colors;
    return [item];
}

function isRgb(value) {
    return Number.isInteger(value) && value >= 0 && value <= 0xffffff;
}

function tars(data) {
    if (!(data instanceof Uint8Array) || data.length > 1048576) throw new Error("虎牙彈幕封包格式錯誤");
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    function read(size) {
        if (!Number.isInteger(size) || size < 0 || size > data.length - offset) throw new Error("虎牙彈幕封包不完整");
        const value = data.subarray(offset, offset + size);
        offset += size;
        return value;
    }

    function field(depth) {
        if (depth > 20) throw new Error("虎牙彈幕巢狀層數過多");
        const head = read(1)[0];
        const type = head & 15;
        const tag = head >> 4 === 15 ? read(1)[0] : head >> 4;
        let value;
        if (type <= 3) {
            const size = 1 << type;
            read(size);
            value = size === 1 ? view.getInt8(offset - 1) : size === 2 ? view.getInt16(offset - 2) : size === 4 ? view.getInt32(offset - 4) : view.getBigInt64(offset - 8);
            if (typeof value === "bigint" && value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) value = Number(value);
        } else if (type === 4 || type === 5) {
            read(type === 4 ? 4 : 8);
            value = type === 4 ? view.getFloat32(offset - 4) : view.getFloat64(offset - 8);
        } else if (type === 6 || type === 7) {
            const size = type === 6 ? read(1)[0] : (read(4), view.getUint32(offset - 4));
            value = decoder.decode(read(size));
        } else if (type === 8 || type === 9) {
            const count = field(depth + 1).value;
            if (!Number.isInteger(count) || count < 0 || count > 4096) throw new Error("虎牙彈幕集合長度錯誤");
            value = [];
            for (let index = 0; index < count; index++) value.push(type === 8 ? [field(depth + 1).value, field(depth + 1).value] : field(depth + 1).value);
        } else if (type === 10) {
            value = record(depth + 1);
        } else if (type === 11 || type === 12) {
            value = 0;
        } else if (type === 13) {
            if (read(1)[0] !== 0) throw new Error("虎牙彈幕 byte 類型錯誤");
            value = read(field(depth + 1).value);
        } else {
            throw new Error("虎牙彈幕包含未知類型");
        }
        return {tag, type, value};
    }

    function record(depth) {
        const result = Object.create(null);
        while (offset < data.length) {
            const item = field(depth);
            if (item.type === 11) break;
            result[item.tag] = item.value;
        }
        return result;
    }
    return record(0);
}
