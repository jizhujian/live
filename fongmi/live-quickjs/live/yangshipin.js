import {Spider, md5X, rsaX} from 'catvod';

const HOST = 'https://www.yangshipin.cn';
const NAVIGATION_URL = 'https://capi.yangshipin.cn/api/oms/pc/navigation/home_top_nav';
const PAGE_URL = 'https://capi.yangshipin.cn/api/oms/pc/page/';
const PLAYER_URL = 'https://player-api.yangshipin.cn/v1/player/';
const OPEN_TOKEN_URL = 'https://h5access.yangshipin.cn/web/open/token';
const KEYGEN_URL = 'https://s.yangshipin.cn/CCTVVideo/cctvh5-openapicore/keygen_bg.wasm';
const KEYGEN_CACHE_KEY = 'keygen:v1';
const KEYGEN_TTL = 86400000;
const KEYGEN_EXPORTS = {
    get_token_rnd: [['i32'], []],
    get_signature: [['i32'], []],
    __wbindgen_malloc: [['i32', 'i32'], ['i32']],
    __wbindgen_free: [['i32', 'i32', 'i32'], []],
    __wbindgen_add_to_stack_pointer: [['i32'], ['i32']],
};
const EPG_URL = 'https://api.cntv.cn/epg/getEpgInfoByChannelNew';
const HLS_MIME = 'application/x-mpegURL';
const AUTO_SOURCE_MS = 8000;
const AUTO_CHOICE_MS = 300000;
const PLAY_SESSION_MS = 7200000;
const AUTO_FAILURE_MS = 30000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
const YSP_APP_ID = '519748109';
const APP_VERSION = 'V1.0.0';
const PLATFORM = '5910204';
const AUTH_SALT = 'n@7QKk%YeSjfw%22';
const REQUEST_SALT = '0f$IVHi9Qno?G';
const TICKET_KEYSTREAM = '6a70e9ac007ccc384c28a88dfd2211decb66494bca83bd6178f85732b2eacc9594e4e5ab720ec3a43e87b3c72b86192ff0dfea8fa8f47794d8792668438c';
const GROUP_NAMES = new Map([['yangshi', '央視頻道'], ['weishi', '衛視頻道']]);
const TV_APP_ID = "9f5c54c4ed0e50109b800f7e28fec205";
const TV_VERSION = "1.4.1";
const TV_BASE = "https://ytpaddr.cctv.cn/gsnw/";
const TV_CLOUD = "https://ytpcloudws.cctv.cn/cloudps/wssapi/device/v2/";
const TV_DEVICE_CODES = new Map([
    [TV_CLOUD + 'get', ['0', '2', '601']],
    [TV_CLOUD + 'register', ['0', '2', '694']],
]);
const TV_REPORT = "https://ytpdata.cctv.cn/das/app/data/message/single";
const TV_VDN = "https://ytpvdn.cctv.cn/cctvmobileinf/rest/cctv/videoliveUrl/getstream";
const TV_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkKeLy4ywWLSnBkwRyqYgF3HMIj05V5uuh5HjyEsZOWnu1NHu3jPQv3sr32wwQNYv5qapsNXmNgLUDHtgHZxqPQAYXltjSRc0qhcD286t62wOIHId8zXS3s1Jy4rgU4qjQWzI9rp/1sE0pMsmwTaJa4zuJ5iz8VwF8Av5oJ1k+HxY+/HLnjNlW1hmWLpuDYmkZYuAoTHa1VGeHQh9FEKI8ZcL3GTQphShUoC+Kg3P1hGUVTtCYapmzPS5lkAdwebuzwvTCfGiTErYZCnPBUSeV7BVlgjtLYIi29KvF0a8FHsJMfe/UdHcyW/RihsIYOtDQcRRpFGXyPXbVrzFJse24QIDAQAB";
const APP_LIVE_URL = "https://bkliveinfo.ysp.cctv.cn/";
const APP_LIVE_PLATFORM = 4330403;
const APP_LIVE_VERSION = "V8.22.1035.3031";
const TV_CHANNELS = new Map(Object.entries({
    "600001859": "Live1717729995180256",
    "600001800": "Live1718261577870260",
    "600001801": "Live1718261955077261",
    "600001814": "Live1718276148119264",
    "600001818": "Live1719474204987287",
    "600001817": "Live1719473996025286",
    "600004092": "Live1718276412224269",
    "600001803": "Live1718276458899270",
    "600004078": "Live1718276503187272",
    "600001805": "Live1718276550002273",
    "600001806": "Live1718276603690275",
    "600001807": "Live1718276623932276",
    "600001811": "Live1718276575708274",
    "600001809": "Live1718276498748271",
    "600001815": "Live1718276319614267",
    "600098637": "Live1718276256572265",
    "600099502": "Live1704966749996185",
    "600001810": "Live1718276138318263",
    "600002264": "Live1767871224782105",
    "600156816": "Live1688400593818102",
    "600014550": "Live1719392219423280",
    "600084704": "Live1719392670442283",
    "600084758": "Live1719392779653284",
    "600084782": "Live1719392885692285",
    "600084744": "Live1719392560433282",
    "600084781": "Live1719392360336281"
}));

const XMLTV_NAMES = new Map(Object.entries({
    CCTV1: 'CCTV-1 综合', CCTV2: 'CCTV-2 财经', CCTV3: 'CCTV-3 综艺', CCTV4: 'CCTV-4 中文国际',
    CCTV5: 'CCTV-5 体育', 'CCTV5+': 'CCTV-5+ 体育赛事', CCTV6: 'CCTV-6 电影', CCTV7: 'CCTV-7 国防 军事',
    CCTV8: 'CCTV-8 电视剧', CCTV9: 'CCTV-9 记录', CCTV10: 'CCTV-10 科教', CCTV11: 'CCTV-11 戏曲',
    CCTV12: 'CCTV-12 社会与法', CCTV13: 'CCTV-13 新闻', CCTV14: 'CCTV-14 少儿', CCTV15: 'CCTV-15 音乐',
    'CCTV16-HD': 'CCTV-16 奥林匹克', 'CCTV16(4K）': 'CCTV-16 奥林匹克', CCTV17: 'CCTV-17 农业 农村',
    CCTV4K: 'CCTV-4K', CCTV8K: 'CCTV8K', CGTN: 'CGTN英语', CGTN法语频道: 'CGTN法语', CGTN俄语频道: 'CGTN俄语',
    CGTN阿拉伯语频道: 'CGTN阿拉伯语', CGTN西班牙语频道: 'CGTN西班牙语', CGTN外语纪录频道: 'CGTN英文记录',
    CCTV风云剧场频道: 'CCTV-风云剧场', CCTV第一剧场频道: 'CCTV-第一剧场', CCTV怀旧剧场频道: 'CCTV-怀旧剧场',
    CCTV世界地理频道: 'CCTV-世界地理', CCTV风云音乐频道: 'CCTV-风云音乐', CCTV兵器科技频道: 'CCTV-兵器科技',
    CCTV风云足球频道: 'CCTV-央视足球', 'CCTV高尔夫·网球频道': 'CCTV-高尔夫网球', CCTV女性时尚频道: 'CCTV-女性时尚',
    CCTV央视文化精品频道: 'CCTV-央视文化精品', CCTV央视台球频道: 'CCTV-央视台球', CCTV电视指南频道: 'CCTV-电视指南',
    CCTV卫生健康频道: 'CCTV-卫生健康',
}));
const LOGO_NAMES = new Map(Object.entries({
    'CCTV16-HD': 'CCTV16', 'CCTV16(4K）': 'CCTV16-4K', CGTN阿拉伯语频道: 'CGTN阿拉伯语',
    CGTN西班牙语频道: 'CGTN西班牙语', CGTN外语纪录频道: 'CGTN纪录', 'CCTV高尔夫·网球频道': 'CCTV高尔夫网球',
}));
const EPG_IDS = new Map(Object.entries({
    'CCTV5+': 'cctv5plus', 'CCTV16-HD': 'cctv16', 'CCTV16(4K）': 'cctv16', CCTV4K: 'cctv4k',
    CCTV8K: 'cctv8k', CCTV第一剧场频道: 'diyijuchang', CCTV世界地理频道: 'shijiedili', CCTV9: 'cctvjilu', CCTV14: 'cctvchild',
}));

class ProxyError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function canonicalQuery(params) {
    return Object.keys(params).sort().map(key => key + '=' + params[key]).join('&');
}

function signature(params, salt) {
    return md5X(canonicalQuery(params) + salt);
}

function randomText(length = 10) {
    const alphabet = 'ABCDEFGHIJKlMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)), value => alphabet[value % alphabet.length]).join('');
}

function hex(bytes) {
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function unhex(value) {
    return Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
}

function ticket(pid, timestamp, guid) {
    const payload = new TextEncoder().encode(`${pid}&${timestamp}&${guid}&${YSP_APP_ID}&bSCz8SqH8T`);
    const key = unhex(TICKET_KEYSTREAM);
    if (payload.length > key.length) throw new Error('invalid ticket payload');
    return hex(payload.map((value, index) => value ^ key[index]));
}

function remaining(deadline, stage) {
    const timeout = deadline - Date.now();
    if (timeout <= 0) throw new ProxyError(504, stage + ': 取址逾時');
    return Math.min(timeout, 15000);
}

function mediaUrl(location, data) {
    const extension = data.extended_param ?? '';
    if (typeof extension !== 'string' || (extension && !extension.startsWith('&'))) throw new ProxyError(502, '播放地址: invalid media parameters');
    return location + (location.includes('?') || !extension ? extension : '?' + extension.slice(1));
}

function jsonObject(content, stage) {
    try {
        const data = JSON.parse(content);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('expected JSON object');
        return data;
    } catch (error) {
        throw new Error(stage + ': invalid JSON response', {cause: error});
    }
}

function varint(payload, cursor) {
    let value = 0n;
    for (let shift = 0n; shift < 70n && cursor.position < payload.length; shift += 7n) {
        const byte = payload[cursor.position++];
        if (shift === 63n && byte > 1) throw new Error('invalid protobuf varint');
        value |= BigInt(byte & 127) << shift;
        if (byte < 128) return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
    }
    throw new Error('invalid protobuf varint');
}

function* fields(payload) {
    const cursor = {position: 0};
    while (cursor.position < payload.length) {
        const key = varint(payload, cursor);
        if (!Number.isInteger(key) || key < 8 || key > 0xffffffff) throw new Error('invalid protobuf field');
        const field = Math.floor(key / 8), wire = key % 8;
        if (wire === 0) {
            yield [field, varint(payload, cursor)];
        } else {
            const size = wire === 1 ? 8 : wire === 5 ? 4 : wire === 2 ? varint(payload, cursor) : -1;
            if (!Number.isSafeInteger(size) || size < 0) throw new Error('unsupported protobuf wire type');
            const end = cursor.position + size;
            if (end > payload.length) throw new Error('truncated protobuf response');
            yield [field, payload.subarray(cursor.position, end)];
            cursor.position = end;
        }
    }
}

function message(payload, repeated = []) {
    if (!(payload instanceof Uint8Array)) throw new Error('invalid protobuf message');
    const result = new Map();
    for (const [field, value] of fields(payload)) {
        if (repeated.includes(field)) {
            if (!result.has(field)) result.set(field, []);
            result.get(field).push(value);
        } else {
            result.set(field, value);
        }
    }
    return result;
}

function response(payload) {
    const result = message(payload);
    if (result.get(1) !== 200 || !(result.get(2) instanceof Uint8Array)) throw new Error('invalid protobuf response: ' + result.get(1));
    return result.get(2);
}

function text(value) {
    return value instanceof Uint8Array ? new TextDecoder('utf-8', {fatal: true}).decode(value) : '';
}

function decodeNavigation(payload) {
    for (const [field, value] of fields(response(payload))) {
        if (field !== 2) continue;
        const channel = message(value), feed = text(channel.get(4)), name = text(channel.get(1));
        if (feed && (name === '电视' || name === '電視' || channel.get(10) === 2)) return feed;
    }
    throw new Error('missing TV feed');
}

function decodePage(payload) {
    const channels = [], seen = new Set();
    for (const [field, value] of fields(response(payload))) {
        if (field !== 2) continue;
        const module = message(value, [15]);
        if (text(module.get(2)) !== 'tvChannel') continue;
        for (const bytes of module.get(15) || []) {
            const channel = decodeChannel(bytes);
            if (!channel.name || !isChannelId(channel.pid) || !isChannelId(channel.cnlid) || seen.has(channel.pid)) continue;
            seen.add(channel.pid);
            channels.push(channel);
        }
    }
    if (channels.length < 50) throw new Error('incomplete channel list');
    return channels;
}

function decodeChannel(payload) {
    const channel = message(payload);
    return {
        name: text(channel.get(2)), pid: text(channel.get(4)), cnlid: text(channel.get(6)),
        logo: text(channel.get(5)), type: text(channel.get(11)), vip: Boolean(channel.get(7)),
    };
}

function snapshotChannel(channel) {
    const name = typeof channel.name === 'string' ? channel.name.trim() : '';
    const pid = snapshotId(channel.pid), cnlid = snapshotId(channel.cnlid);
    if (!name || !isChannelId(pid) || !isChannelId(cnlid)) throw new Error('invalid snapshot channel');
    return {...channel, name, pid, cnlid, logo: typeof channel.logo === 'string' ? channel.logo : ''};
}

function snapshotId(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
}

function isChannelId(value) {
    return typeof value === 'string' && /^\d+$/.test(value);
}

function epgId(name) {
    if (EPG_IDS.has(name)) return EPG_IDS.get(name);
    const match = /^CCTV(\d{1,2})$/.exec(name);
    return match && Number(match[1]) >= 1 && Number(match[1]) <= 17 ? 'cctv' + match[1] : '';
}

function epgTime(value) {
    const seconds = epochSeconds(value);
    if (!Number.isFinite(seconds)) return '';
    const date = new Date((seconds + 8 * 60 * 60) * 1000);
    const year = date.getUTCFullYear();
    return year >= 1 && year <= 9999 ? date.toISOString().slice(11, 19) : '';
}

function epochSeconds(value) {
    if (typeof value !== 'number' && !(typeof value === 'string' && /^-?\d+$/.test(value))) return NaN;
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : NaN;
}

function isToken(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isPlayUrl(value) {
    if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
        return false;
    }
}

function validKeygen(bytes) {
    return Array.isArray(bytes) && bytes.length >= 20000 && bytes.length <= 100000
        && bytes.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
        && bytes[0] === 0 && bytes[1] === 97 && bytes[2] === 115 && bytes[3] === 109;
}

class Keygen {
    constructor(wasm, bytes) {
        this.state = {};
        this.heap = new Map();
        this.nextHandle = 132;
        this.closed = false;
        this.instance = wasm.instantiate(bytes, {wbg: {
            __wbg_get_9c1840f7ecd81363: this.get.bind(this),
            __wbindgen_string_get: this.stringGet.bind(this),
            __wbindgen_object_drop_ref: (instance, handle) => this.heap.delete(handle),
        }});
        try {
            this.validateExports();
        } catch (error) {
            this.close();
            throw error;
        }
    }

    validateExports() {
        for (const [name, [params, results]] of Object.entries(KEYGEN_EXPORTS)) {
            const signature = this.instance.exports[name];
            if (!signature) throw new Error('missing keygen export: ' + name);
            if (signature.params.join(',') !== params.join(',') || signature.results.join(',') !== results.join(',')) throw new Error('incompatible keygen export: ' + name);
        }
        if (!this.instance.byteLength) throw new Error('missing keygen memory');
    }

    get(instance, pointer, length) {
        const path = new TextDecoder('utf-8', {fatal: true}).decode(instance.read(pointer, length));
        const value = path.startsWith('cctvh5openapi.state.') ? this.state[path.slice(20)] ?? ''
            : path === 'window.location.host' ? 'www.yangshipin.cn' : path === 'window.location.protocol' ? 'https:' : '';
        const handle = this.nextHandle++;
        this.heap.set(handle, String(value));
        return handle;
    }

    stringGet(instance, output, handle) {
        const bytes = new TextEncoder().encode(this.heap.get(handle) || '');
        const pointer = instance.call('__wbindgen_malloc', bytes.length, 1);
        instance.write(pointer, bytes);
        const result = new DataView(new ArrayBuffer(8));
        result.setInt32(0, pointer, true);
        result.setInt32(4, bytes.length, true);
        instance.write(output, result);
    }

    call(name, state) {
        this.state = state;
        try {
            const output = this.instance.call('__wbindgen_add_to_stack_pointer', -16);
            this.instance.call(name, output);
            const bytes = this.instance.read(output, 8);
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const pointer = view.getInt32(0, true), length = view.getInt32(4, true);
            const result = new TextDecoder('utf-8', {fatal: true}).decode(this.instance.read(pointer, length));
            if (pointer) this.instance.call('__wbindgen_free', pointer, length, 1);
            this.instance.call('__wbindgen_add_to_stack_pointer', 16);
            return result;
        } catch (error) {
            this.close();
            throw error;
        }
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        try {
            this.instance.close();
        } finally {
            this.heap.clear();
            this.state = {};
        }
    }
}

function randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}

function concatBytes(...parts) {
    const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

function base64(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
        output += alphabet[a >>> 2] + alphabet[((a & 3) << 4) | ((b || 0) >>> 4)];
        output += b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c || 0) >>> 6)];
        output += c === undefined ? '=' : alphabet[c & 63];
    }
    return output;
}

function decodeBase64(value) {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('invalid Base64');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const output = [];
    let bits = 0, count = 0;
    for (const character of value.replace(/=+$/, '')) {
        bits = (bits << 6) | alphabet.indexOf(character);
        count += 6;
        if (count >= 8) output.push((bits >>> (count -= 8)) & 255);
    }
    return Uint8Array.from(output);
}

function be32(value) {
    return Uint8Array.of(value >>> 24, value >>> 16, value >>> 8, value);
}

function pack(value) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    if (bytes.length > 65535) throw new Error('signature field too long');
    return concatBytes(Uint8Array.of(bytes.length >>> 8, bytes.length), bytes);
}

function xorBytes(left, right) {
    return left.map((value, index) => value ^ right[index]);
}

async function digest(algorithm, value) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    return new Uint8Array(await crypto.subtle.digest(algorithm, bytes));
}

async function mgf1(seed, length) {
    const blocks = [];
    for (let counter = 0; blocks.length * 32 < length; counter++) blocks.push(await digest('SHA-256', concatBytes(seed, be32(counter))));
    return concatBytes(...blocks).slice(0, length);
}

async function rsaDeviceId(value) {
    const message = new TextEncoder().encode(value), size = 256;
    if (message.length > size - 66) throw new Error('device id too long');
    const data = concatBytes(await digest('SHA-256', new Uint8Array()), new Uint8Array(size - 66 - message.length), Uint8Array.of(1), message);
    const seed = randomBytes(32), maskedData = xorBytes(data, await mgf1(seed, data.length));
    const maskedSeed = xorBytes(seed, await mgf1(maskedData, seed.length));
    // The host provides raw RSA; this protocol requires OAEP with SHA-256 for both hashes.
    return rsaX('RSA/None/NoPadding', true, true, base64(concatBytes(Uint8Array.of(0), maskedSeed, maskedData)), true, TV_PUBLIC_KEY, true);
}

async function aesKey(value) {
    const key = new Uint8Array(32);
    key.set(new TextEncoder().encode(value).slice(0, 32));
    return crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function decryptGcm(value, key) {
    try {
        const data = decodeBase64(value);
        if (data.length < 28) throw new Error('short payload');
        const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: data.slice(0, 12), tagLength: 128}, await aesKey(key), data.slice(12));
        return new TextDecoder('utf-8', {fatal: true}).decode(plain);
    } catch (error) {
        throw new ProxyError(502, '電視端 AES-GCM 驗證失敗');
    }
}

async function encryptGcm(value, key) {
    const nonce = randomBytes(12);
    const data = await crypto.subtle.encrypt({name: 'AES-GCM', iv: nonce, tagLength: 128}, await aesKey(key), new TextEncoder().encode(value));
    return base64(concatBytes(nonce, new Uint8Array(data)));
}

function isPlaybackUrl(value) {
    if (typeof value !== 'string' || /[\s\u0000-\u001f\u007f\\]/.test(value)) return false;
    const authority = /^https?:\/\/([^/?#]+)/i.exec(value)?.[1];
    if (!authority || authority.includes('@')) return false;
    try {
        const url = new URL(value);
        if (url.port && (!/^\d+$/.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535)) return false;
        return ['cctv.cn', 'cctv.com', 'cntv.cn', 'cntv.com', 'cctvpic.com', 'citvc.com', 'yangshipin.cn']
            .some(suffix => url.hostname === suffix || url.hostname.endsWith('.' + suffix));
    } catch {
        return false;
    }
}

class AppPlayerApi {
    constructor(owner) {
        this.owner = owner;
    }

    static checksum(bytes) {
        let value = 0;
        for (const byte of bytes) value = (Math.imul(value, 131) + byte) & 0x7fffffff;
        return value;
    }

    static teaBlock(block, key) {
        const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
        const keys = new DataView(key.buffer, key.byteOffset, key.byteLength);
        let left = view.getUint32(0), right = view.getUint32(4), sum = 0;
        for (let round = 0; round < 16; round++) {
            sum = (sum + 0x9e3779b9) >>> 0;
            left = (left + (((right << 4) + keys.getUint32(0)) ^ (right + sum) ^ ((right >>> 5) + keys.getUint32(4)))) >>> 0;
            right = (right + (((left << 4) + keys.getUint32(8)) ^ (left + sum) ^ ((left >>> 5) + keys.getUint32(12)))) >>> 0;
        }
        return concatBytes(be32(left), be32(right));
    }

    static teaPacket(data, key) {
        const padding = (8 - ((data.length + 10) % 8)) % 8;
        const plain = concatBytes(Uint8Array.of((randomBytes(1)[0] & 248) | padding), randomBytes(padding + 2), data, new Uint8Array(7));
        let previousPlain = new Uint8Array(8), previousCipher = new Uint8Array(8);
        const output = new Uint8Array(plain.length);
        for (let offset = 0; offset < plain.length; offset += 8) {
            const mixed = xorBytes(plain.slice(offset, offset + 8), previousCipher);
            const cipher = xorBytes(this.teaBlock(mixed, key), previousPlain);
            output.set(cipher, offset);
            previousPlain = mixed;
            previousCipher = cipher;
        }
        return output;
    }

    static ckey(cnlid) {
        const timestamp = Math.floor(Date.now() / 1000), guid = hex(randomBytes(16));
        let guard = pack(concatBytes(be32(timestamp), pack(guid.slice(-5)), pack(''), pack(''), pack('-1')));
        let encrypted = concatBytes(this.teaPacket(guard, unhex('110dbec10c23e7d2e56a1cad6914ef1b')), be32(this.checksum(guard)));
        let mask = unhex('b3c953a06913ad4d');
        guard = hex(encrypted.map((value, index) => value ^ mask[index % mask.length])).toUpperCase();
        let body = concatBytes(unhex('0000004200000004000004d2'), be32(APP_LIVE_PLATFORM), be32(0), be32(timestamp));
        for (const value of ['dcgh', '_zj1A5Gh6QYcxWjIUGos2w==', APP_LIVE_VERSION, cnlid, guid]) body = concatBytes(body, pack(value));
        body = concatBytes(body, be32(1), be32(1));
        for (const value of [hex(randomBytes(4)).toUpperCase(), 'nil', '57eab0c4-2c58-44c6-8ae9-dd2757525dc5', 'nil', 'v0.1.000',
            'com.cctv.yangshipin.app.iphone', String(APP_LIVE_PLATFORM), 'ex_json_bus', 'ex_json_vs', guard]) body = concatBytes(body, pack(value));
        const packet = pack(body);
        packet.set(be32(this.checksum(packet)), 18);
        encrypted = concatBytes(this.teaPacket(packet, unhex('59b2f7cf725ef43c34fdd7c123411ed3')), be32(this.checksum(packet)));
        mask = unhex('842eed08f066e6ea48b4caa991ed6ff3');
        const ckey = base64(encrypted.map((value, index) => value ^ mask[index % mask.length])).replace(/\+/g, '_').replace(/\//g, '-').replace(/=+$/, '');
        return {cKey: '--01' + ckey, guid, fntick: String(timestamp), flowid: crypto.randomUUID().replace(/-/g, '').toUpperCase() + '_' + APP_LIVE_PLATFORM};
    }

    async resolve(pid, cnlid, definition, deadline) {
        this.owner.assertActive();
        const params = {
            atime: '120', livepid: pid, cnlid, appVer: APP_LIVE_VERSION, app_version: '300090', caplv: '1', cmd: '2', defn: definition,
            device: 'iPhone', encryptVer: '4.2', getpreviewinfo: '0', hevclv: '0', lang: 'zh-Hans_CN', livequeue: '0', logintype: '1',
            nettype: '1', newnettype: '1', newplatform: String(APP_LIVE_PLATFORM), platform: String(APP_LIVE_PLATFORM), sdtfrom: 'v3021',
            spacode: '23', spaudio: '1', spdemuxer: '6', spdrm: '2', spdynamicrange: '1', spflv: '1', spflvaudio: '1', sphdrfps: '60',
            sphttps: '1', spvcode: base64(new TextEncoder().encode('H(30:1080,60:1080|30:1080,60:1080)')), spvideo: '4', stream: '1',
            system: '1', sysver: 'ios18.2.1', uhd_flag: '0', playbacktime: '0', ...AppPlayerApi.ckey(cnlid),
        };
        const timeout = remaining(deadline, 'App 直播取址');
        const reply = await this.owner.net.req(APP_LIVE_URL, {params, headers: {'User-Agent': 'qqlive', Accept: 'application/json'}, timeout, callTimeout: timeout});
        this.owner.checkResponse(reply, 'App 直播取址');
        remaining(deadline, 'App 直播取址');
        const value = jsonObject(reply.content, 'App 直播取址');
        if (!['number', 'string'].includes(typeof value.iretcode) || String(value.iretcode) !== '0') {
            const code = /^-?\d+$/.test(String(value.iretcode)) ? String(value.iretcode) : 'invalid';
            throw new ProxyError(502, 'App 直播取址: iretcode=' + code);
        }
        const candidates = [value.playurl], backup = value.backurl_list || value.backurlList || value.backurl;
        if (Array.isArray(backup)) {
            for (const item of backup) candidates.push(item && typeof item === 'object' ? item.url || item.playurl : item);
        } else if (typeof backup === 'string') candidates.push(...backup.split(/[;,]\s*(?=https?:\/\/)/));
        const url = candidates.find(isPlaybackUrl);
        if (!url) throw new ProxyError(502, 'App 直播取址: no usable HLS URL');
        const headers = value.http_header === undefined ? {} : value.http_header;
        if (!headers || typeof headers !== 'object' || Array.isArray(headers) || Object.entries(headers).some(([key, value]) => typeof value !== 'string')) throw new ProxyError(502, 'App 直播取址: invalid playback headers');
        return {url: mediaUrl(url, value), headers: {'User-Agent': 'qqlive', Referer: 'https://live.cctv.cn/', ...headers}};
    }
}

class TvPlayerApi {
    constructor(owner) {
        this.owner = owner;
        let identity = owner.local.get('tv-device:v1');
        if (!identity || typeof identity.android_id !== 'string' || !/^[0-9a-f]{16}$/.test(identity.android_id)
            || typeof identity.mac !== 'string' || !/^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/.test(identity.mac)) {
            const mac = randomBytes(6);
            mac[0] = (mac[0] | 2) & 254;
            identity = {android_id: hex(randomBytes(8)), mac: Array.from(mac, value => value.toString(16).padStart(2, '0')).join(':')};
            owner.local.set('tv-device:v1', identity);
        }
        this.profile = {
            ...identity, hardware: 'mt5895', board: 'mt5895', brand: 'Sony', device: 'sony_xr_85z9k', manufacturer: 'Sony', model: 'XR-85Z9K',
            product: 'sony_xr_85z9k', tags: 'release-keys', build_type: 'user', user: 'build', resolution: '7680*4320',
            display: 'XR-85Z9K-user 13 SONYTV.2022.XR_85Z9K 2024 release-keys', version_id: 'SONYTV.2022.XR_85Z9K', host: 'sony-tv-build',
            fingerprint: 'Sony/sony_xr_85z9k/sony_xr_85z9k:13/SONYTV.2022.XR_85Z9K/2024:user/release-keys',
        };
        this.uid = '';
        this.fingerprint = '';
        this.sessionKey = '';
        this.guid = '';
        this.createdAt = 0;
        this.lastHeartbeat = 0;
    }

    async initializeUid() {
        if (this.uid) return;
        const fields = ['hardware', 'board', 'brand', 'device', 'manufacturer', 'model', 'product', 'tags', 'build_type', 'user', 'resolution', 'mac'];
        const source = '1698' + fields.map(key => this.profile[key]).join('');
        const hash = value => {
            let result = 0;
            for (let i = 0; i < value.length; i++) result = (Math.imul(result, 31) + value.charCodeAt(i)) | 0;
            return BigInt.asUintN(64, BigInt(result)).toString(16).padStart(16, '0');
        };
        this.uid = hex(await digest('SHA-1', this.profile.android_id + '|' + hash(source) + hash(this.profile.model))).toUpperCase();
        this.owner.assertActive();
    }

    common() {
        const p = this.profile;
        const value = {
            cctv_id: this.uid, device_id: p.android_id, idfa: '', idfv: '', user_id: '', app_key: '1178c84d-4818-44ff-b415-02106e87e144',
            imei: '', android_id: p.android_id, mac: p.mac, system_type: 'Android', device_type: 'TV', app_language: 'CHINESE',
            app_version: TV_VERSION, sdk_version: '', os_version: '13', app_channel: 'dangbei', data_time: String(Date.now()),
            device_builder_type: p.build_type, device_params: p.device, device_model: 'XR85Z9K',
        };
        for (const key of ['hardware', 'board', 'brand', 'display', 'version_id', 'host', 'product', 'tags', 'user', 'fingerprint', 'manufacturer', 'resolution']) value['device_' + key] = p[key];
        return value;
    }

    async request(url, data, deadline, stage, headers = {}, form = false) {
        this.owner.assertActive();
        const timeout = remaining(deadline, stage);
        const reply = await this.owner.net.req(url, {
            method: 'POST', data, postType: form ? 'form' : 'json', timeout, callTimeout: timeout,
            headers: {
                Accept: 'application/json', 'Accept-Language': 'zh-CN,zh;q=0.8', Referer: 'api.cctv.cn', 'User-Agent': 'cctv_app_tv',
                UID: this.profile.android_id, appChannel: 'dangbei', 'X-Uid': this.uid, 'X-Fingerprint': this.fingerprint,
                'X-Version': TV_VERSION, 'X-Timestamp': String(Date.now()), 'X-Nonce': crypto.randomUUID(),
                'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', ...headers,
            },
        });
        const codes = TV_DEVICE_CODES.get(url);
        if (codes && reply.code === 400 && !reply.error) {
            let value;
            try {
                value = jsonObject(reply.content, stage);
            } catch (error) {
                throw new ProxyError(400, stage + ': HTTP 400; ' + error.message);
            }
            if (codes.includes(String(value.result ?? value.code))) {
                this.owner.assertActive();
                remaining(deadline, stage);
                return value;
            }
        }
        this.owner.checkResponse(reply, stage);
        remaining(deadline, stage);
        return jsonObject(reply.content, stage);
    }

    data(value, stage) {
        const code = value.result ?? value.code ?? value.ret;
        if (code != null && String(code) !== '0') throw new ProxyError(502, stage + ': code=' + String(code));
        if (!Object.hasOwn(value, 'data')) throw new ProxyError(502, stage + ': missing data');
        return value.data;
    }

    async bootstrap(deadline) {
        await this.initializeUid();
        const timestamp = Date.now(), day0 = Math.floor((Math.floor(timestamp / 1000) + 28800) / 86400) * 86400000 - 28800000;
        const first = hex(await digest('SHA-256', TV_APP_ID + this.uid + timestamp + day0));
        this.fingerprint = hex(await digest('SHA-256', first));
        const start = await this.request(TV_BASE + 'api/app/start/v1/01', {key: 'app_start_d1', value: this.common()}, deadline,
            '電視端初始化', {UID: '', 'X-Timestamp': String(timestamp)});
        const data = this.data(start, '電視端初始化');
        this.sessionKey = await decryptGcm(typeof data === 'string' ? data : data?.key, this.fingerprint.slice(0, 32));
        const body = {device_name: '央视频电视投屏助手', device_id: await rsaDeviceId(this.uid)};
        let cloud = await this.request(TV_CLOUD + 'get', body, deadline, '電視設備查詢');
        if (['601', '2'].includes(String(cloud.result ?? cloud.code))) {
            cloud = await this.request(TV_CLOUD + 'register', body, deadline, '電視設備註冊');
            if (['0', '694', '2'].includes(String(cloud.result ?? cloud.code)) && !cloud.data?.guid) cloud = await this.request(TV_CLOUD + 'get', body, deadline, '電視設備查詢');
        }
        const registered = this.data(cloud, '電視設備註冊');
        this.guid = registered?.guid;
        if (!isToken(this.guid)) throw new ProxyError(502, '電視設備註冊: missing guid');
        this.createdAt = Date.now();
        this.lastHeartbeat = 0;
    }

    async heartbeat(deadline) {
        if (Date.now() - this.lastHeartbeat < 30000) return;
        const value = {...this.common(), network_type: 'WiFi', guid: this.guid, other: ''};
        const result = await this.request(TV_REPORT, {key: 'app_heartbeat', value}, deadline, '電視設備心跳');
        const code = result.result ?? result.code;
        if (code != null && String(code) !== '0') {
            this.sessionKey = '';
            throw new ProxyError(502, '電視設備心跳: code=' + String(code));
        }
        this.lastHeartbeat = Date.now();
    }

    async resolve(liveId, deadline) {
        try {
            if (!this.sessionKey || Date.now() - this.createdAt >= PLAY_SESSION_MS) await this.bootstrap(deadline);
            await this.heartbeat(deadline);
            const body = {screenParam: '7680-4320-280', rate: '', systemType: 'ios', model: 'XR-85Z9K', id: liveId,
                userId: 'BAEBFF2B-C516-4F34-ABC0-A824A6461CBD', clientSign: 'cctvVideo', deviceId: {serial: '', imei: '', android_id: ''}};
            const one = this.data(await this.request(TV_BASE + 'api/live/v1/01', body, deadline, '電視端畫質列表'), '電視端畫質列表');
            const videos = one?.videoList || one?.videos;
            if (!Array.isArray(videos)) throw new ProxyError(502, '電視端畫質列表: missing videos');
            const candidates = videos.filter(item => item && typeof item.url === 'string' && item.url);
            if (!candidates.length) throw new ProxyError(502, '電視端畫質列表: no usable URL');
            const video = candidates.find(item => item.rate === '36p') || candidates[0];
            const rawUrl = /^https?:\/\//.test(video.url) ? video.url : await decryptGcm(video.url, this.sessionKey);
            const two = this.data(await this.request(TV_BASE + 'api/live/v1/02', {guid: await encryptGcm('', this.sessionKey)}, deadline, '電視端播放授權'), '電視端播放授權');
            const secret = await decryptGcm(typeof two === 'string' ? two : two?.appSecret ?? two?.app_secret, this.sessionKey);
            const random = hex(randomBytes(4)) + '-0000-' + hex(randomBytes(2)) + '-0000-00000000' + hex(randomBytes(2));
            const headers = {APPID: TV_APP_ID, APPSIGN: md5X(TV_APP_ID + secret + random), APPRANDOMSTR: random};
            const appcommon = JSON.stringify({adid: '', an: '央视频电视投屏助手', ap: 'cctv_app_tv', av: TV_VERSION});
            const result = await this.request(TV_VDN, {appcommon, url: rawUrl}, deadline, '電視端播放地址', headers, true);
            if (String(result.succeed) !== '1' || !isPlaybackUrl(result.url)) throw new ProxyError(502, '電視端播放地址: no usable HLS URL');
            this.owner.assertActive();
            return {url: result.url, headers: {...headers, UID: this.profile.android_id, Referer: 'api.cctv.cn', 'User-Agent': 'cctv_app_tv'}, rate: video.rate || ''};
        } catch (error) {
            this.sessionKey = '';
            throw error;
        }
    }
}


export default class Yangshipin extends Spider {
    init(extend = '') {
        this.snapshotUrl = extend;
        this.destroyed = false;
        this.tvQueue = Promise.resolve();
        this.invalidateTvSession();
    }

    async liveContent(url) {
        this.assertActive();
        const channels = await this.loadChannels(url);
        this.assertActive();
        const groups = new Map();
        let number = 0;
        for (const channel of channels) {
            const name = GROUP_NAMES.get(channel.type) || '其他頻道';
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(this.channelItem(channel, ++number));
        }
        return Array.from(groups, ([name, channel]) => ({name, channel}));
    }

    async loadChannels(url) {
        try {
            return await this.fetchChannels(url);
        } catch (error) {
            if (!this.snapshotUrl || this.destroyed) throw error;
            console.warn('央視頻 catalog fallback: ' + error.message);
            return this.loadSnapshot();
        }
    }

    async fetchChannels(url) {
        const cacheKey = String(Math.floor(Date.now() / 5000));
        const navigationUrl = new URL(url || NAVIGATION_URL);
        navigationUrl.searchParams.set('_', cacheKey);
        const navigation = await this.catalogBytes(navigationUrl.href);
        const pageUrl = PAGE_URL + encodeURIComponent(decodeNavigation(navigation)) + '?' + cacheKey;
        return decodePage(await this.catalogBytes(pageUrl));
    }

    async loadSnapshot() {
        const url = new URL(this.snapshotUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('invalid snapshot url');
        const result = await this.net.json(url.href, {timeout: 8000, callTimeout: 8000});
        this.assertActive();
        if (!Array.isArray(result?.channels) || !result.channels.length) throw new Error('invalid channel snapshot');
        const channels = result.channels.filter(channel => channel && typeof channel === 'object' && !Array.isArray(channel)).map(snapshotChannel);
        if (!channels.length) throw new Error('invalid channel snapshot');
        return channels;
    }

    channelItem(channel, number) {
        const name = channel.name, id = epgId(name);
        const logo = LOGO_NAMES.get(name) || name.replace(/频道$/, '');
        const item = {
            name, tvgName: XMLTV_NAMES.get(name) || name, tvgId: channel.pid, number: String(number).padStart(2, '0'),
            logo: logo ? 'https://epg.112114.xyz/logo/' + encodeURIComponent(logo) + '.png' : channel.logo,
            format: HLS_MIME, ua: USER_AGENT, referer: HOST + '/',
            urls: [this.proxyUrl({type: 'auto', pid: channel.pid, cnlid: channel.cnlid, defn: channel.vip ? 'shd' : 'fhd', cmg: '1'})],
        };
        if (id) item.epg = this.proxyUrl({type: 'epg', id}) + '&date={date}';
        return item;
    }

    async proxy(params) {
        try {
            this.assertActive();
            if (params.type === 'epg') {
                const content = await this.epg(params.id, params.date);
                this.assertActive();
                return [200, 'application/json', content];
            }
            if (params.type === 'auto') return await this.proxyAuto(params);
            if (['app', 'tv', 'web'].includes(params.type)) return await this.proxyLive(params);
            const refresh = String(params['cache-control'] || '').toLowerCase().replace(/ /g, '').split(',').includes('no-cache');
            const location = await this.resolve(params.pid, params.cnlid, refresh);
            this.assertActive();
            return [302, 'text/plain', '', {Location: location}];
        } catch (error) {
            return [error instanceof ProxyError ? error.status : 502, 'text/plain; charset=utf-8', '央視頻: ' + error.message];
        }
    }

    invalidateTvSession() {
        this.tvPlayer = null;
        this.tvCachePrefix = 'tvplay:' + hex(randomBytes(8)) + ':';
    }

    async withTvSession(deadline, task) {
        remaining(deadline, '電視端播放取址');
        const previous = this.tvQueue;
        let release, timer;
        const gate = new Promise(resolve => { release = resolve; });
        this.tvQueue = previous.then(() => gate);
        try {
            try {
                await Promise.race([previous, new Promise((resolve, reject) => {
                    timer = setTimeout(() => reject(new ProxyError(this.destroyed ? 503 : 504,
                        this.destroyed ? '播放服務已關閉' : '電視端播放取址: 等待逾時')), Math.max(1, deadline - Date.now()));
                })]);
            } finally {
                if (timer !== undefined) clearTimeout(timer);
            }
            this.assertActive();
            remaining(deadline, '電視端播放取址');
            const result = await task();
            this.assertActive();
            return result;
        } finally {
            release();
        }
    }

    async tvEntry(pid, cnlid, deadline, refresh) {
        if (!TV_CHANNELS.has(pid) || !isChannelId(cnlid)) throw new ProxyError(400, 'invalid TV channel id');
        this.assertActive();
        const key = this.tvCachePrefix + pid;
        if (refresh) this.net.clearCache(key);
        const entry = await this.net.cached(key, {ttl: 60000, stale: false}, () => this.withTvSession(deadline, async () => {
            try {
                this.tvPlayer ??= new TvPlayerApi(this);
                return await this.tvPlayer.resolve(TV_CHANNELS.get(pid), deadline);
            } catch (error) {
                this.invalidateTvSession();
                throw error;
            }
        }));
        this.assertActive();
        return {...entry, cacheKey: key};
    }

    async appEntry(pid, cnlid, definition, deadline, refresh) {
        if (!isChannelId(pid) || !isChannelId(cnlid) || !['fhd', 'shd'].includes(definition)) throw new ProxyError(400, 'invalid App channel id');
        this.assertActive();
        const key = 'appplay:' + pid + ':' + cnlid + ':' + definition;
        if (refresh) this.net.clearCache(key);
        const entry = await this.net.cached(key, {ttl: 60000, stale: false}, () => new AppPlayerApi(this).resolve(pid, cnlid, definition, deadline));
        this.assertActive();
        return {...entry, cacheKey: key};
    }

    async liveEntry(source, params, deadline, refresh = false) {
        const {pid, cnlid} = params, definition = params.defn ?? 'fhd';
        let entry;
        if (source === 'tv') entry = await this.tvEntry(pid, cnlid, deadline, refresh);
        else if (source === 'app') entry = await this.appEntry(pid, cnlid, definition, deadline, refresh);
        else entry = {url: await this.resolve(pid, cnlid, refresh, deadline), headers: this.playerHeaders(), cacheKey: 'play:' + pid + ':' + cnlid};
        const generation = md5X(entry.url + '\n' + canonicalQuery(entry.headers));
        return {...entry, source, pid, cnlid, defn: definition, generation};
    }

    autoKey(params) {
        return 'auto:' + params.pid + ':' + params.cnlid + ':' + (params.defn ?? 'fhd');
    }

    sourceFailure(params, source) {
        return this.net.cached(this.autoKey(params) + ':' + source, {ttl: AUTO_FAILURE_MS, stale: false}, () => '');
    }

    entryKey(params) {
        return this.autoKey(params) + ':entry:' + params.type + ':' + params.generation;
    }

    async resourceEntry(params, deadline) {
        return this.net.cached(this.entryKey(params), {ttl: PLAY_SESSION_MS, stale: false}, async () => {
            const entry = await this.liveEntry(params.type, params, deadline);
            if (entry.generation !== params.generation) throw new ProxyError(410, '播放來源已更新，請重新播放');
            return entry;
        });
    }

    async failSource(params, source, error, entry) {
        this.assertActive();
        if (error?.name === 'AbortError' || /CancellationException|InterruptedException/.test(String(error))) throw error;
        if (entry) {
            if (params.generation) {
                const choice = await this.net.cached(this.autoKey(params), {ttl: AUTO_CHOICE_MS, stale: false}, () => ({source, generation: entry.generation}));
                if (choice.source !== source || choice.generation !== params.generation) return;
            }
            this.net.clearCache(entry.cacheKey);
        }
        const message = String(error.message || error).split('\n', 1)[0].replace(/https?:\/\/[^\s]+/g, '[網址]').slice(0, 160);
        const key = this.autoKey(params) + ':' + source;
        this.net.clearCache(key);
        await this.net.cached(key, {ttl: AUTO_FAILURE_MS, stale: false}, () => message);
        console.warn('央視頻 ' + source + ': ' + message);
    }

    async proxyAuto(params) {
        this.assertActive();
        if (!isChannelId(params.pid) || !isChannelId(params.cnlid) || !['fhd', 'shd'].includes(params.defn ?? 'fhd') || params.url || (params.kind ?? 'playlist') !== 'playlist' || params.generation) throw new ProxyError(400, 'invalid automatic playback request');
        const deadline = Date.now() + 25000;
        const sources = [...(TV_CHANNELS.has(params.pid) ? ['tv'] : []), 'web', 'app'];
        const key = this.autoKey(params);
        const choice = await this.net.cached(key, {ttl: AUTO_CHOICE_MS, stale: false}, () => ({source: sources[0], generation: ''}));
        const index = sources.indexOf(choice.source);
        if (index >= 0) sources.unshift(...sources.splice(index, 1));
        const refresh = String(params['cache-control'] || '').toLowerCase().replace(/ /g, '').split(',').includes('no-cache');
        const errors = [];
        for (const source of sources) {
            this.assertActive();
            const failure = await this.sourceFailure(params, source);
            if (failure) {
                errors.push(source + ': ' + failure);
                continue;
            }
            remaining(deadline, '自動播放取址');
            const attemptDeadline = Math.min(deadline, Date.now() + AUTO_SOURCE_MS);
            let entry;
            try {
                entry = await this.liveEntry(source, params, attemptDeadline, refresh);
                await this.proxyEntry(entry, params, attemptDeadline, true);
                this.assertActive();
                const selected = {source, generation: entry.generation};
                if (selected.source !== choice.source || selected.generation !== choice.generation) {
                    this.net.clearCache(key);
                    await this.net.cached(key, {ttl: AUTO_CHOICE_MS, stale: false}, () => selected);
                }
                const target = {type: source, pid: entry.pid, cnlid: entry.cnlid, defn: entry.defn, generation: entry.generation};
                return [302, 'text/plain', '', {Location: this.proxyUrl(target), 'Cache-Control': 'no-store'}];
            } catch (error) {
                await this.failSource(params, source, error, entry);
                errors.push(source + ': ' + await this.sourceFailure(params, source));
            }
        }
        throw new ProxyError(502, '所有播放來源均失敗（' + errors.join('；') + '）');
    }

    async proxyLive(params) {
        const {pid, cnlid} = params, source = params.type, definition = params.defn ?? 'fhd', kind = params.kind ?? 'playlist';
        if (!['app', 'tv', 'web'].includes(source) || !['playlist', 'segment'].includes(kind)) throw new ProxyError(400, 'invalid playback resource type');
        if (params.url && !isPlaybackUrl(params.url)) throw new ProxyError(400, 'invalid playback URL');
        const deadline = Date.now() + 25000;
        if (!isChannelId(pid) || !isChannelId(cnlid) || !['fhd', 'shd'].includes(definition)) throw new ProxyError(400, 'invalid playback channel id');
        const entry = params.generation ? await this.resourceEntry(params, deadline) : await this.liveEntry(source, params, deadline);
        try {
            return await this.proxyEntry(entry, params, deadline);
        } catch (error) {
            await this.failSource(params, source, error, entry);
            throw error;
        }
    }

    async proxyEntry(entry, params, deadline, probe = false) {
        const {source, pid, cnlid} = entry, kind = params.kind ?? 'playlist';
        const url = params.url || entry.url;
        if (!isPlaybackUrl(url)) throw new ProxyError(400, 'invalid playback URL');
        const headers = {...entry.headers};
        if (kind === 'segment') {
            if (params.range) headers.Range = params.range;
            remaining(deadline, '直播切片');
            const milliseconds = Math.max(1, deadline - Date.now());
            const reply = await this.net.stream(url, {headers, timeout: Math.min(15000, milliseconds), callTimeout: milliseconds});
            try {
                this.assertActive();
                if (reply.code >= 400) await this.failSource(params, source, new ProxyError(reply.code, '直播切片: HTTP ' + reply.code), entry);
                return [reply.code, reply.contentType, reply.stream, reply.headers];
            } catch (error) {
                reply.stream.close();
                throw error;
            }
        }
        if (source === 'tv') await this.withTvSession(deadline, async () => {
            try {
                if (!this.tvPlayer) throw new ProxyError(503, '播放服務已關閉');
                await this.tvPlayer.heartbeat(deadline);
            } catch (error) {
                this.invalidateTvSession();
                throw error;
            }
        });
        if (String(params['cache-control'] || '').toLowerCase().replace(/ /g, '').split(',').includes('no-cache')) headers['Cache-Control'] = 'no-cache';
        const playlist = await this.fetchPlaylist(url, headers, deadline);
        if (probe) await this.probePlaylist(playlist.text, playlist.url, headers, deadline);
        const target = {type: source, pid, cnlid, defn: entry.defn, generation: entry.generation};
        await this.net.cached(this.entryKey(target), {ttl: PLAY_SESSION_MS, stale: false}, () => entry);
        const content = this.rewritePlaylist(playlist.text, playlist.url, target);
        return [200, HLS_MIME, content, {'Cache-Control': 'no-store'}];
    }

    async probePlaylist(playlist, baseUrl, headers, deadline) {
        for (let count = 0; count < 3; count++) {
            let variant = false, uri;
            for (const raw of playlist.split(/\r?\n/)) {
                const line = raw.trim();
                if (line.startsWith('#EXT-X-STREAM-INF:')) variant = true;
                else if (line && !line.startsWith('#')) {
                    uri = line;
                    break;
                }
            }
            if (!uri) throw new ProxyError(502, '直播 HLS: missing media URI');
            const url = new URL(uri, baseUrl).href;
            if (!isPlaybackUrl(url)) throw new ProxyError(502, '直播 HLS: invalid media URL');
            if (variant || new URL(url).pathname.toLowerCase().endsWith('.m3u8')) {
                const next = await this.fetchPlaylist(url, headers, deadline);
                playlist = next.text;
                baseUrl = next.url;
                continue;
            }
            for (const match of playlist.matchAll(/#EXT-X-(?:KEY|MAP):[^\r\n]*?URI="([^"]+)"/g)) {
                const resource = new URL(match[1], baseUrl).href;
                if (!isPlaybackUrl(resource)) throw new ProxyError(502, '直播 HLS: invalid media URL');
                await this.probeMedia(resource, headers, deadline);
            }
            await this.probeMedia(url, headers, deadline);
            return;
        }
        throw new ProxyError(502, '直播 HLS: playlist nesting too deep');
    }

    async probeMedia(url, headers, deadline) {
        const milliseconds = remaining(deadline, '直播切片驗證');
        const reader = await this.net.openStream(url, {headers, timeout: milliseconds, callTimeout: milliseconds});
        try {
            if (![200, 206].includes(reader.code)) throw new ProxyError(502, '直播切片驗證: HTTP ' + reader.code);
            if (/^(text\/html|application\/json)/i.test(reader.contentType)) throw new ProxyError(502, '直播切片驗證: unexpected content type');
            const chunk = await reader.read(1);
            if (!chunk?.byteLength) throw new ProxyError(502, '直播切片驗證: empty response');
            this.assertActive();
            remaining(deadline, '直播切片驗證');
        } finally {
            reader.close();
        }
    }

    async fetchPlaylist(url, headers, deadline) {
        for (let count = 0; count < 6; count++) {
            if (!isPlaybackUrl(url)) throw new ProxyError(502, '直播 HLS: invalid redirect URL');
            const timeout = remaining(deadline, '直播 HLS');
            const reply = await this.net.req(url, {headers, redirect: 0, timeout, callTimeout: timeout});
            this.assertActive();
            remaining(deadline, '直播 HLS');
            if (!reply.error && [301, 302, 303, 307, 308].includes(reply.code)) {
                const location = Object.entries(reply.headers || {}).find(([key]) => key.toLowerCase() === 'location')?.[1];
                if (typeof location !== 'string' || !location) throw new ProxyError(502, '直播 HLS: missing redirect location');
                url = new URL(location, url).href;
                continue;
            }
            this.checkResponse(reply, '直播 HLS');
            if (reply.code !== 200 || typeof reply.content !== 'string' || !reply.content.trimStart().startsWith('#EXTM3U')) throw new ProxyError(502, '直播 HLS: invalid playlist');
            return {text: reply.content, url};
        }
        throw new ProxyError(502, '直播 HLS: too many redirects');
    }

    rewritePlaylist(playlist, baseUrl, target) {
        const proxy = (value, kind) => {
            const url = new URL(value, baseUrl).href;
            if (!isPlaybackUrl(url)) throw new ProxyError(502, '直播 HLS: invalid resource URL');
            if (target.type === 'web' && kind === 'segment') return url;
            const params = {...target, kind, url};
            return this.proxyUrl(params);
        };
        let variant = false;
        const lines = playlist.split(/\r?\n/).map(line => {
            const stripped = line.trim();
            if (stripped.startsWith('#')) {
                const kind = /^#EXT-X-(MEDIA|I-FRAME-STREAM-INF|RENDITION-REPORT):/.test(stripped) ? 'playlist' : 'segment';
                line = line.replace(/URI="([^"]+)"/g, (match, uri) => 'URI="' + proxy(uri, kind) + '"');
                if (stripped.startsWith('#EXT-X-STREAM-INF:')) variant = true;
            } else if (stripped) {
                line = proxy(stripped, variant || new URL(stripped, baseUrl).pathname.toLowerCase().endsWith('.m3u8') ? 'playlist' : 'segment');
                variant = false;
            }
            return line;
        });
        if (lines[lines.length - 1] === '') lines.pop();
        return lines.join('\n') + '\n';
    }

    async epg(id, date) {
        if (typeof id !== 'string' || !/^[a-z0-9]+$/.test(id)) throw new ProxyError(400, 'invalid epg channel id');
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < 1 || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new ProxyError(400, 'invalid date');
        return this.net.cached('epg:' + id + ':' + date, {ttl: 3600000, stale: false}, () => this.loadEpg(id, date));
    }

    async loadEpg(id, date) {
        const result = await this.net.json(EPG_URL, {
            params: {c: id, serviceId: 'tvcctv', d: date.replace(/-/g, '')},
            headers: {Referer: 'https://tv.cctv.com/', 'User-Agent': USER_AGENT}, timeout: 8000, callTimeout: 8000,
        });
        this.assertActive();
        const rows = result?.data?.[id]?.list;
        if (!Array.isArray(rows)) throw new Error('invalid epg response');
        const items = [];
        for (const row of rows) {
            const title = String(row?.title || '').trim(), start = epgTime(row?.startTime), end = epgTime(row?.endTime);
            if (title && start && end) items.push({title, start, end});
        }
        return JSON.stringify({date, epg_data: items});
    }

    async resolve(pid, cnlid, refresh = false, deadline = Date.now() + 25000) {
        if (!isChannelId(pid) || !isChannelId(cnlid)) throw new ProxyError(400, 'invalid channel id');
        const key = 'play:' + pid + ':' + cnlid;
        if (refresh) this.net.clearCache(key);
        return this.net.cached(key, {ttl: 60000, stale: false}, () => this.resolvePlayer(pid, cnlid, deadline));
    }

    async resolvePlayer(pid, cnlid, deadline) {
        remaining(deadline, '簽名初始化');
        const guid = Date.now().toString(36) + '_' + randomText(11);
        const session = this.net.session();
        let keygen;
        try {
            keygen = await this.loadKeygen(deadline);
            this.setPlayerCookies(session, guid);
            const auth = await this.auth(session, pid, guid, deadline);
            const params = await this.playParams(pid, cnlid, guid);
            const headers = await this.sdkHeaders(session, guid, params, deadline, keygen);
            headers.yspPlayerToken = String(auth.token);
            headers.yspticket = ticket(pid, String(auth.ts), guid);
            params.rand_str = randomText();
            params.signature = signature(params, REQUEST_SALT);
            const result = await this.requestJson(session, PLAYER_URL + 'get_live_info', deadline, '取得播放資訊', {method: 'POST', data: params, headers});
            return this.playLocation(result);
        } finally {
            try {
                keygen?.close();
            } finally {
                session.close();
            }
        }
    }

    async loadKeygen(deadline) {
        const record = await this.net.cached(KEYGEN_CACHE_KEY, {ttl: KEYGEN_TTL, stale: false, persist: true}, () => this.fetchKeygen(deadline));
        this.assertActive();
        remaining(deadline, '簽名初始化');
        if (!validKeygen(record?.bytes)) throw new ProxyError(502, '簽名初始化: invalid cached wasm');
        return new Keygen(this.wasm, Uint8Array.from(record.bytes));
    }

    async fetchKeygen(deadline) {
        const cached = this.net.peek(KEYGEN_CACHE_KEY);
        const previous = validKeygen(cached?.bytes) ? cached : null;
        const headers = {'User-Agent': USER_AGENT};
        if (typeof previous?.etag === 'string' && previous.etag) headers['If-None-Match'] = previous.etag;
        if (typeof previous?.modified === 'string' && previous.modified) headers['If-Modified-Since'] = previous.modified;
        const timeout = remaining(deadline, '簽名檔更新');
        const response = await this.net.req(KEYGEN_URL, {headers, buffer: 3, timeout, callTimeout: timeout});
        this.assertActive();
        const conditional = 'If-None-Match' in headers || 'If-Modified-Since' in headers;
        let bytes;
        if (!response.error && response.code === 304 && previous && conditional) {
            bytes = previous.bytes;
        } else {
            this.checkResponse(response, '簽名檔更新');
            if (response.code !== 200) throw new ProxyError(502, '簽名檔更新: unexpected HTTP ' + response.code);
            bytes = Array.from(new Uint8Array(response.content));
            if (!validKeygen(bytes)) throw new ProxyError(502, '簽名檔更新: invalid official wasm');
        }
        remaining(deadline, '簽名檔更新');
        const candidate = new Keygen(this.wasm, Uint8Array.from(bytes));
        candidate.close();
        const metadata = Object.fromEntries(Object.entries(response.headers || {}).map(([name, value]) => [name.toLowerCase(), value]));
        const retained = response.code === 304 ? previous : null;
        remaining(deadline, '簽名檔更新');
        return {bytes, etag: typeof metadata.etag === 'string' ? metadata.etag : retained?.etag || '', modified: typeof metadata['last-modified'] === 'string' ? metadata['last-modified'] : retained?.modified || ''};
    }

    async playParams(pid, cnlid, guid) {
        const timestamp = String(Math.round(Date.now() / 1000));
        return {
            cnlid, livepid: pid, stream: '2', guid, cKey: await this.ckey(cnlid, timestamp, guid), adjust: 1,
            sphttps: '1', platform: PLATFORM, cmd: '2', encryptVer: '8.1', dtype: '1', devid: 'devid', otype: 'ojson',
            appVer: APP_VERSION, app_version: APP_VERSION, channel: 'ysp_tx', defn: 'fhd',
        };
    }

    async auth(session, pid, guid, deadline) {
        const params = {pid, guid, appid: 'ysp_pc', rand_str: randomText()};
        params.signature = signature(params, AUTH_SALT);
        const result = await this.requestJson(session, PLAYER_URL + 'auth', deadline, '播放授權', {
            method: 'POST', data: params, postType: 'form', headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
        });
        if (result.code !== 0 || !isToken(result.data?.token) || !(epochSeconds(result.data?.ts) > 0)) throw new ProxyError(502, '播放授權: ' + (result.msg || 'player auth failed'));
        return result.data;
    }

    async sdkHeaders(session, guid, params, deadline, keygen) {
        const input = md5X(canonicalQuery(params)), sequence = '1';
        const requestId = '999999' + randomText() + Date.now();
        const composite = `${input}-${guid}-${sequence}-${requestId}`;
        const state = {guid, token: '', input: '', yspappid: YSP_APP_ID, ts: String(Date.now()), version: 'v1', query: 'object'};
        const result = await this.requestJson(session, OPEN_TOKEN_URL, deadline, '簽名授權', {
            params: {yspappid: YSP_APP_ID, guid, vappid: '59306155', vsecret: 'b42702bf7309a179d102f3d51b1add2fda0bc7ada64cb801', raw: 1, version: 'v1', ts: state.ts, rnd: keygen.call('get_token_rnd', state)},
        });
        if (!isToken(result.data?.token)) throw new ProxyError(502, '簽名授權: ' + (result.msg || 'open token failed'));
        state.token = result.data.token;
        state.input = composite;
        return {
            'Content-Type': 'application/json;charset=UTF-8', yspsdkinput: input,
            yspsdksign: keygen.call('get_signature', state) + '-' + composite,
            seqId: sequence, 'request-id': requestId, yspappid: YSP_APP_ID,
        };
    }

    async ckey(cnlid, timestamp, guid) {
        const raw = `|${cnlid}|${timestamp}|mg3c3b04ba|${APP_VERSION}|${guid}|${PLATFORM}|https://www.yangshipin.c|mozilla/5.0 (windows nt ||Mozilla|Netscape|Win32|`;
        let value = 0;
        for (const character of raw) value = (Math.imul(value, 31) + character.charCodeAt(0)) | 0;
        const key = await crypto.subtle.importKey('raw', unhex('48e5918a74ae21c972b90cce8af6c8be'), 'AES-CBC', false, ['encrypt']);
        const encrypted = await crypto.subtle.encrypt({name: 'AES-CBC', iv: unhex('9a7e7d23610266b1d9fbf98581384d92')}, key, new TextEncoder().encode('|' + value + raw));
        return '--01' + hex(new Uint8Array(encrypted)).toUpperCase();
    }

    playLocation(result) {
        if (result.code !== 0) throw new ProxyError(502, '取得播放資訊: ' + (result.msg || 'play api rejected channel'));
        const data = result.data || {};
        if (data.iretcode != null && data.iretcode !== 0) throw new ProxyError(502, '取得播放資訊: ' + (data.errinfo || 'channel is unavailable'));
        const locations = (data.backurl_list || []).map(item => item?.url).concat(data.playurl);
        const location = locations.find(isPlayUrl);
        if (!location) throw new ProxyError(502, '取得播放資訊: missing hls manifest');
        return mediaUrl(location, data);
    }

    setPlayerCookies(session, guid) {
        const cookies = {guid, versionName: '99.99.99', versionCode: '999999', vplatform: '109', platformVersion: 'Chrome', deviceModel: '148', newLogin: '1', nseqId: '1'};
        for (const [name, value] of Object.entries(cookies)) {
            if (!session.setCookie(HOST, `${name}=${value}; Domain=yangshipin.cn; Path=/`)) throw new Error('invalid player cookie');
        }
    }

    async requestJson(session, url, deadline, stage, options) {
        const timeout = remaining(deadline, stage);
        const result = await session.req(url, {...options, headers: {...this.playerHeaders(), ...options.headers}, timeout, callTimeout: timeout});
        this.checkResponse(result, stage);
        remaining(deadline, stage);
        return jsonObject(result.content, stage);
    }

    playerHeaders() {
        return {
            Origin: HOST, Referer: HOST + '/', 'User-Agent': USER_AGENT, yspappid: YSP_APP_ID,
            'sec-ch-ua': '"Chromium";v="148", "Not=A?Brand";v="24"', 'sec-ch-ua-mobile': '?0', 'sec-ch-ua-platform': '"Windows"',
        };
    }

    async catalogBytes(url) {
        const result = await this.net.req(url, {
            buffer: 3, timeout: 8000, callTimeout: 8000,
            headers: {...this.playerHeaders(), Accept: 'application/octet-stream', 'app-platform': 'pc', 'app-version': '1.0.0', platform: '109'},
        });
        this.checkResponse(result, '頻道清單');
        return new Uint8Array(result.content);
    }

    checkResponse(result, stage) {
        this.assertActive();
        if (result.error) throw new ProxyError(/timeout|timed out/i.test(result.error) ? 504 : 502, stage + ': ' + result.error);
        if (result.code < 200 || result.code >= 300) throw new ProxyError(result.code >= 400 && result.code <= 599 ? result.code : 502, stage + ': HTTP ' + result.code);
    }

    assertActive() {
        if (this.destroyed) throw new ProxyError(503, '播放服務已關閉');
    }

    destroy() {
        this.destroyed = true;
        this.invalidateTvSession();
    }
}
