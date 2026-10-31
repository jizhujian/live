const TIMESTAMP_WRAP = 2 ** 32;
const AUDIO_WAIT_MS = 400;
const SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
const SILENT_FRAMES = {
    1: [0, 200, 0, 128, 35, 128],
    2: [33, 0, 73, 144, 2, 25, 0, 35, 128],
};

export function createYyFlvNormalizer() {
    let base, restart = false, config, silence, duration = 0, nextAudio, reference;
    const last = {};

    function timestamp(value) {
        if (reference !== undefined) value -= Math.floor((value - reference + TIMESTAMP_WRAP / 2) / TIMESTAMP_WRAP) * TIMESTAMP_WRAP;
        reference = Math.max(reference ?? value, value);
        base ??= value;
        if (restart) {
            base = Math.min(base, value - Math.max(...Object.values(last)) - 1);
            restart = false;
        }
        return value - base;
    }

    function* fillAudio(stamp) {
        while (silence && nextAudio + AUDIO_WAIT_MS < stamp) {
            const value = Math.round(nextAudio);
            yield audioTag(Math.max(0, value), silence);
            last[8] = value;
            nextAudio += duration;
        }
    }

    return function* normalizeTag(source, data) {
        const kind = source[0], body = data.subarray(0, data.length - 4);
        let stamp = uint24(source, 4) + source[7] * 16777216;
        if (kind === 18 && Object.keys(last).length) {
            restart = true;
            nextAudio = undefined;
            reference = undefined;
        }
        if (kind === 8 && body.length >= 4 && body[0] >> 4 === 10 && body[1] === 0 && String(body) !== config) {
            config = String(body);
            ({silence, duration} = audioConfig(body));
            nextAudio = undefined;
        }
        if ((kind === 8 || kind === 9) && body.length >= 2 && body[1] === 1) {
            stamp = timestamp(stamp);
            if (last[kind] !== undefined && stamp <= last[kind]) return;
            nextAudio ??= stamp;
            if (kind === 9) yield* fillAudio(stamp);
            else nextAudio = stamp + duration;
            last[kind] = stamp;
        } else stamp -= base ?? 0;
        const tag = new Uint8Array(source);
        writeTimestamp(tag, Math.max(0, stamp));
        yield [tag, data];
    };
}

function audioConfig(data) {
    const profile = data[2] >> 3, index = (data[2] & 7) * 2 + (data[3] >> 7), channels = data[3] >> 3 & 15;
    if (profile !== 2 || index >= SAMPLE_RATES.length || !SILENT_FRAMES[channels] || data[3] & 7) return {silence: undefined, duration: 0};
    return {silence: new Uint8Array([data[0], 1, ...SILENT_FRAMES[channels]]), duration: 1024000 / SAMPLE_RATES[index]};
}

function audioTag(stamp, data) {
    const tag = new Uint8Array(11), body = new Uint8Array(data.length + 4);
    tag[0] = 8;
    tag[1] = data.length >>> 16;
    tag[2] = data.length >>> 8;
    tag[3] = data.length;
    writeTimestamp(tag, stamp);
    body.set(data);
    new DataView(body.buffer).setUint32(data.length, data.length + 11);
    return [tag, body];
}

function uint24(data, offset) {
    return data[offset] * 65536 + data[offset + 1] * 256 + data[offset + 2];
}

function writeTimestamp(tag, value) {
    tag[4] = value >>> 16;
    tag[5] = value >>> 8;
    tag[6] = value;
    tag[7] = value >>> 24;
}
