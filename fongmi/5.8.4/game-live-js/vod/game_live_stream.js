export async function* flvStream(open, minDuration = 0, createNormalizer) {
    const timeline = {started: false, last: -1};
    const delays = [500, 1000, 2000];
    let failures = 0;
    while (true) {
        const reader = await open();
        const previous = timeline.last;
        let failure;
        try {
            yield* readFlv(reader, timeline, createNormalizer?.());
        } catch (error) {
            if (!(error instanceof ReadError)) throw error;
            failure = error.cause;
        } finally {
            reader.close();
        }
        const duration = timeline.last - previous;
        if (!failure && duration >= minDuration) {
            failures = 0;
        } else {
            if (duration >= 10000) failures = 0;
            if (failures === delays.length) throw failure || new Error("直播串流反覆提前結束");
            failures++;
        }
        if (failures) await net.sleep(delays[failures - 1]);
    }
}

class ReadError extends Error {}

async function* readFlv(reader, timeline, normalize) {
    const read = readBytes(reader);
    const header = await readFlvHeader(read);
    const continuing = timeline.started;
    if (!continuing) {
        timeline.started = true;
        yield header;
    }
    const clock = {base: null, start: timeline.last + 1, previous: 0, wrap: 0};
    let count = 0, size = 0, batch = [];
    let flushAt = Date.now() + 250;
    let failure;
    try {
        while (true) {
            const tag = await read(11);
            if (!tag) break;
            const type = tag[0];
            const length = uint24(tag, 1);
            if ((type !== 8 && type !== 9 && type !== 18) || uint24(tag, 8) !== 0) throw new Error("直播 FLV 封包無效");
            const data = await read(length + 4);
            if (!data) break;
            if (uint32(data, length) !== length + 11) throw new Error("直播 FLV 封包長度錯誤");
            const packets = normalize ? normalize(tag, data) : [[tag, data]];
            for (const [tag, data] of packets) {
                if (tag[0] === 18 && continuing) continue;
                const media = isMedia(tag[0], data, data.length - 4);
                if (media) count++;
                writeTimestamp(tag, timestamp(tag, clock, timeline, media));
                batch.push(tag, data);
                size += tag.byteLength + data.byteLength;
                if (size >= 65536 || Date.now() >= flushAt) {
                    yield join(batch);
                    batch = [];
                    size = 0;
                    flushAt = Date.now() + 250;
                }
            }
        }
    } catch (error) {
        if (!(error instanceof ReadError)) throw error;
        failure = error;
    }
    if (size) yield join(batch);
    if (failure) throw failure;
    if (!count) throw new Error("直播串流已結束，沒有可續接的媒體資料");
}

async function readFlvHeader(read) {
    const header = await read(9);
    if (!header || header[0] !== 70 || header[1] !== 76 || header[2] !== 86 || header[3] !== 1) throw new Error("直播串流不是 FLV");
    const offset = uint32(header, 5);
    if (offset < 9 || offset > 65536) throw new Error("直播 FLV 標頭無效");
    const extra = await read(offset - 9 + 4);
    if (!extra) throw new Error("直播 FLV 標頭不完整");
    return join([header, extra]);
}

function readBytes(reader) {
    let chunk = new Uint8Array(0), offset = 0;
    return async function(size) {
        let result;
        let position = 0;
        while (position < size) {
            if (offset === chunk.byteLength) {
                let value;
                try {
                    value = await reader.read();
                } catch (error) {
                    throw new ReadError(error.message, {cause: error});
                }
                if (value === null) return null;
                chunk = new Uint8Array(value);
                offset = 0;
            }
            const count = Math.min(size - position, chunk.byteLength - offset);
            if (position === 0 && count === size) {
                const view = chunk.subarray(offset, offset + count);
                offset += count;
                return view;
            }
            if (!result) result = new Uint8Array(size);
            result.set(chunk.subarray(offset, offset + count), position);
            position += count;
            offset += count;
        }
        return result;
    };
}

function isMedia(type, data, length) {
    if (length < 2 || type === 18) return false;
    if (type === 8) return data[0] >> 4 !== 10 || data[1] === 1;
    const codec = data[0] & 15;
    return codec !== 7 && codec !== 12 || data[1] === 1;
}

function timestamp(tag, clock, timeline, media) {
    if (!media) return Math.max(0, timeline.last);
    const value = uint24(tag, 4) + tag[7] * 16777216;
    if (clock.previous - value > 2147483648) clock.wrap += 4294967296;
    clock.previous = value;
    const current = value + clock.wrap;
    if (clock.base === null) clock.base = current;
    const result = Math.max(0, clock.start + current - clock.base);
    timeline.last = Math.max(timeline.last, result);
    return result;
}

function uint24(bytes, offset) {
    return bytes[offset] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2];
}

function uint32(bytes, offset) {
    return bytes[offset] * 16777216 + uint24(bytes, offset + 1);
}

function writeTimestamp(tag, value) {
    tag[4] = value >>> 16;
    tag[5] = value >>> 8;
    tag[6] = value;
    tag[7] = value >>> 24;
}

function join(chunks) {
    const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}
