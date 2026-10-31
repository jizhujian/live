import {subscribe} from "./game_live_protocol.js";
import {flvStream} from "./game_live_stream.js";
import {createYyFlvNormalizer} from "./game_live_yy.js";

const DOUYU = "https://www.douyu.com";
const HUYA = "https://www.huya.com";
const YY = "https://www.yy.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
const NAMES = {douyu: "斗魚", huya: "虎牙", yy: "YY"};
const STYLE = {type: "rect", ratio: 1.78};
const HUYA_GROUPS = [
    {id: "ol", name: "網遊競技", game: "100023"},
    {id: "pc", name: "單機熱遊", game: "100002"},
    {id: "yl", name: "娛樂天地", game: "100022"},
    {id: "sy", name: "手遊休閒", game: "100004"},
];

export default function() {
    let deviceId;

    function init() {
        deviceId = crypto.randomUUID().replaceAll("-", "");
    }

    async function home(filter) {
        const result = {class: Object.entries(NAMES).map(([id, name]) => ({type_id: id, type_name: name, land: 1, ratio: 1.78}))};
        if (filter) result.filters = Object.fromEntries(await net.map(Object.keys(NAMES), async id => [id, await filters(id)]));
        return result;
    }

    async function filters(platform) {
        const items = await groups(platform);
        return [
            {key: "view", name: "顯示", init: "live", value: [{n: "直播", v: "live"}, {n: "分類", v: "games"}]},
            {key: "group", name: "分區", value: [{n: "全部", v: ""}, ...items.map(item => ({n: item.name, v: item.id}))]},
        ];
    }

    async function douyu(url, options = {}) {
        const result = await net.json(url, {...options, headers: {...headers("douyu"), ...options.headers}});
        const code = result.error ?? result.code;
        if (!douyuSuccess(code)) throw new Error("斗魚：" + (result.msg || "接口回應錯誤"));
        if (result.data == null) throw new Error("斗魚接口缺少資料");
        return result.data;
    }

    async function huyaRoom(id) {
        return net.cached(`room:huya:${id}`, {ttl: 5000, stale: false}, async () => {
            const result = await net.json("https://mp.huya.com/cache.php", {params: {m: "Live", do: "profileRoom", roomid: id}, headers: headers("huya")});
            if (result.status !== 200 || !result.data?.profileInfo) throw new Error("虎牙：" + (result.message || "房間不存在"));
            return result.data;
        });
    }

    async function groups(platform) {
        if (platform === "huya") return HUYA_GROUPS;
        if (platform === "yy") return net.cached("groups:yy", {ttl: 86400000, persist: true}, yyGroups);
        return net.cached("groups:douyu", {ttl: 86400000, persist: true}, async () => {
            const items = await douyu(DOUYU + "/japi/weblist/api/getC1List");
            if (!Array.isArray(items) || !items.length) throw new Error("斗魚主分類格式錯誤");
            return items.map(item => ({id: String(item.cid1), name: item.cname1}));
        });
    }

    async function games(platform, group = "") {
        if (platform === "yy") {
            const items = await groups(platform);
            return group ? items.filter(item => item.id === group) : items;
        }
        const items = await net.cached(`catalog:${platform}:${platform === "huya" ? group : ""}`, {ttl: 86400000, persist: true}, async () => {
            if (platform === "douyu") {
                const items = await douyu(DOUYU + "/api/v1/getColumnDetail");
                if (!Array.isArray(items)) throw new Error("斗魚分類格式錯誤");
                return items.filter(item => item.is_del === "0" && item.is_hidden === "0").map(item => ({id: String(item.tag_id), group: String(item.cate_id), name: item.tag_name, pic: item.pic_url || item.pic_name}));
            }
            const response = await net.http(HUYA + (group ? "/g_" + group : "/g"), {headers: headers(platform)});
            if (response.error || response.code !== 200) throw new Error("虎牙分類載入失敗：" + (response.error || response.code));
            const result = htmlQuery(response.content, {queries: {games: {selector: "li.g-gameCard-item[data-gid]", fields: {
                id: {attribute: "data-gid"}, name: {attribute: "title"}, pic: {selector: "img", attribute: "data-original"}, src: {selector: "img", attribute: "src"},
            }}}});
            if (!result.games.length) throw new Error("虎牙分類頁沒有取得資料");
            return result.games.map(item => ({id: item.id, name: item.name, pic: item.pic || item.src}));
        });
        return platform === "douyu" && group ? items.filter(item => item.group === group) : items;
    }

    async function category(tid, pg, filter, extend = {}) {
        const [platform, kind, value] = tid.split("/");
        if (!NAMES[platform]) throw new Error("未知直播平台");
        const current = pageNumber(pg);
        if (kind === "s") return searchRooms(platform, decodeURIComponent(value || ""), current);
        const group = kind === "g" ? "" : extend.group || (kind === "p" ? value : "");
        const parent = group ? (await groups(platform)).find(item => item.id === group) : null;
        if (group && !parent) throw new Error("未知直播分區");
        if (kind !== "g" && (extend.view === "games" || (kind === "p" && !extend.view))) {
            const result = page(group ? await games(platform, group) : await groups(platform), current, 60);
            result.list = result.list.map(item => ({vod_id: `${platform}/${group || platform === "yy" ? "g" : "p"}/${item.id}`, vod_name: item.name, vod_pic: image(item.pic), vod_tag: "folder", style: group ? STYLE : {type: "list"}}));
            return result;
        }
        const game = kind === "g" ? value : parent?.game || "0";
        if (!/^\d+$/.test(game)) throw new Error("分類編號格式錯誤");
        let directory = game;
        if (platform === "douyu") directory = kind === "g" ? "2_" + game : group ? "1_" + group : "0_0";
        return net.cached(`list:${platform}:${directory}:${current}`, {ttl: 20000, stale: false}, () => rooms(platform, directory, current));
    }

    async function rooms(platform, game, current) {
        if (platform === "yy") return yyRooms(game, current);
        if (platform === "douyu") {
            const data = await douyu(`${DOUYU}/gapi/rkc/directory/mixList/${game}/${current}`);
            if (!Array.isArray(data.rl) || !Number.isInteger(data.pgcnt)) throw new Error("斗魚直播列表格式錯誤");
            return {list: data.rl.map(item => card(platform, item.rid, item.rn, item.rs16 || item.rs1, item.nn)), page: current, pagecount: Math.max(1, data.pgcnt), limit: 120};
        }
        const result = await net.json(HUYA + "/cache.php", {params: {m: "LiveList", do: "getLiveListByPage", gameId: game, tagAll: 0, page: current}, headers: headers("huya")});
        const data = result.data;
        if (result.status !== 200 || !Array.isArray(data?.datas) || !Number.isInteger(data.totalPage)) throw new Error("虎牙直播列表格式錯誤");
        return {list: data.datas.map(item => card(platform, item.profileRoom, item.introduction || item.roomName || item.nick, item.screenshot, item.nick)), page: current, pagecount: Math.max(1, data.totalPage), limit: data.pageSize, total: data.totalCount};
    }

    function search(key, quick, pg = "1") {
        const current = pageNumber(pg);
        const keyword = String(key).trim();
        return page(Object.entries(NAMES).map(([platform, name]) => ({vod_id: `${platform}/s/${encodeURIComponent(keyword)}`, vod_name: `${name}：${keyword}`, vod_remarks: "搜尋主播或房間編號", vod_tag: "folder", style: {type: "list"}})), current, Object.keys(NAMES).length);
    }

    async function searchRooms(platform, keyword, current) {
        if (/^[0-9]+$/.test(keyword)) {
            if (current !== 1) return {list: [], page: current, pagecount: 1, limit: 1};
            const result = await detail(`${platform}:${keyword}`);
            return {list: result.list.map(item => ({...item, style: STYLE})), page: 1, pagecount: 1, limit: 1};
        }
        if (platform === "yy") return yySearch(keyword, current);
        if (platform === "douyu") {
            const data = await douyu(DOUYU + "/japi/search/api/searchShow", {params: {kw: keyword, page: current, pageSize: 20}});
            if (!Array.isArray(data.relateShow) || !Number.isInteger(data.total)) throw new Error("斗魚搜尋回應格式錯誤");
            return page(data.relateShow.map(item => card(platform, item.rid, item.roomName, item.roomSrc, item.nickName)), current, 20, data.total);
        }
        const result = await net.json("https://search.cdn.huya.com/", {params: {m: "Search", do: "getSearchContent", q: keyword, typ: -5, rows: 20, start: (current - 1) * 20, v: 4}, headers: headers("huya")});
        const data = result.response?.["1"];
        if (result.responseHeader?.status !== 0 || !Array.isArray(data?.docs) || !Number.isInteger(data.numFound)) throw new Error("虎牙搜尋回應格式錯誤");
        const items = data.docs.map(item => card(platform, item.room_id, item.live_intro || item.game_nick, item.game_avatarUrl180, item.game_nick + (item.gameLiveOn ? "" : " · 未開播")));
        return page(items, current, 20, data.numFound);
    }

    async function detail(id) {
        const room = roomId(id);
        let vod;
        if (room.platform === "douyu") {
            const data = await douyu("https://open.douyucdn.cn/api/RoomApi/room/" + room.id);
            vod = card(room.platform, data.room_id, data.room_name, data.room_thumb, data.owner_name);
            vod.vod_content = [data.cate_name, data.owner_name, data.room_status === "1" ? "直播中" : "未開播"].filter(Boolean).join(" · ");
        } else if (room.platform === "yy") {
            const data = await yyRoom(room.id);
            vod = yyCard(data);
            vod.vod_content = [data.biz, data.name, "直播中"].filter(Boolean).join(" · ");
        } else {
            const data = await huyaRoom(room.id);
            const profile = data.profileInfo;
            const live = data.liveData || {};
            vod = card(room.platform, profile.profileRoom, live.introduction || live.roomName || profile.nick, live.screenshot || profile.avatar180, profile.nick);
            vod.vod_content = [live.gameFullName, profile.nick, data.realLiveStatus === "ON" ? "直播中" : "未開播"].filter(Boolean).join(" · ");
        }
        vod.vod_play_from = NAMES[room.platform];
        vod.vod_play_url = "觀看直播$" + vod.vod_id;
        return {list: [vod]};
    }

    function douyuStream(id) {
        return net.cached(`stream:douyu:${id}`, {ttl: 5000, stale: false}, () => fetchDouyuStream(id));
    }

    async function fetchDouyuStream(id) {
        const scripts = await net.cached(`sign:douyu:${id}`, {ttl: 300000, stale: false}, () => douyu(DOUYU + "/swf_api/homeH5Enc", {params: {rids: id}}));
        const source = scripts[`room${id}`];
        if (typeof source !== "string" || !source) throw new Error("斗魚播放簽名資料無效");
        const signed = await js.eval("var CryptoJS = {MD5: md5X};\n" + source + "\nub98484234(rid, did, tt);", {
            globals: {rid: id, did: deviceId, tt: String(Math.floor(Date.now() / 1000))}
        });
        const params = Object.fromEntries(new URLSearchParams(signed));
        return douyu(`${DOUYU}/lapi/live/getH5Play/${id}`, {
            method: "POST", postType: "form", data: {...params, cdn: "", rate: 0},
        });
    }

    async function douyuUrl(id) {
        const data = await douyuStream(id);
        if (!data.rtmp_url || !data.rtmp_live) throw new Error("斗魚目前沒有可播放的直播");
        return data.rtmp_url.replace(/\/$/, "") + "/" + data.rtmp_live.replace(/^\//, "");
    }

    async function douyuLiveSource(id) {
        const url = await douyuUrl(id);
        const format = new URL(url).pathname.endsWith(".m3u8") ? "application/x-mpegURL" : "video/x-flv";
        return {parse: 0, url: format === "video/x-flv" ? getProxyUrl({live: "douyu:" + id}) : url, header: headers("douyu"), format};
    }

    async function douyuReplayInfo(id) {
        return net.cached(`replay:douyu:${id}`, {ttl: 60000, stale: false}, async () => {
            const result = await net.json(DOUYU + "/wgapi/live/liveweb/roomapi/biz/getSwitch", {params: {rid: id}, headers: headers("douyu")});
            const data = result.data;
            if (!douyuSuccess(result.code) || !data?.playback || !data.roomInfo) throw new Error("斗魚回看資料無效");
            const show = Number(data.playback.show);
            const start = Number(data.playback.startTime) * 1000;
            if (show === 1 && (!Number.isSafeInteger(start) || start <= 0 || start >= Date.now())) throw new Error("斗魚回看時間無效");
            return {show, start, window: (Number(data.roomInfo.aiLiveSummary) === 1 ? 24 : 2) * 3600000};
        });
    }

    async function douyuTimeshift(id) {
        try {
            const info = await douyuReplayInfo(id);
            if (info.show !== 1) return;
            return {url: getProxyUrl({replay: "douyu:" + id, time: "{time}"}), start: info.start, window: info.window};
        } catch (error) {
            console.log("斗魚回看資料暫時無法取得，保留直播播放");
        }
    }

    async function douyuReplay(id, value) {
        if (!/^\d+$/.test(String(value))) throw new Error("回看時間無效");
        const time = Number(value);
        if (time === 0) return douyuLiveSource(id);
        const now = Date.now();
        if (!Number.isSafeInteger(time) || time <= 0 || time >= now) throw new Error("回看時間無效");
        const info = await douyuReplayInfo(id);
        if (info.show !== 1) throw new Error("斗魚目前未提供回看");
        const start = Math.max(time, info.start, now - info.window);
        const data = await douyu(DOUYU + "/japi/universe/playback/getVodStream", {params: {
            rid: id, startTime: Math.ceil(start / 1000), pt: 2, rate: 0, client_sys: "web", timeshiftReplay: 1, isloopclick: 0,
        }});
        if (typeof data.timeshiftUrl !== "string" || !/^https?:\/\//.test(data.timeshiftUrl)) throw new Error("斗魚沒有回傳回看播放網址");
        return {parse: 0, url: data.timeshiftUrl, header: headers("douyu"), format: "application/x-mpegURL"};
    }

    async function huyaLines(id) {
        const data = await huyaRoom(id);
        if (data.realLiveStatus !== "ON") throw new Error("虎牙主播目前未開播");
        const lines = data.stream?.baseSteamInfoList;
        if (!Array.isArray(lines)) throw new Error("虎牙缺少播放線路");
        const available = lines.filter(item => Number.isFinite(item.iWebPriorityRate) && item.iWebPriorityRate > 0)
            .sort((a, b) => b.iWebPriorityRate - a.iWebPriorityRate);
        if (!available.length) throw new Error("虎牙沒有可播放的線路");
        return available;
    }

    async function huyaStreamUrl(id, cdn) {
        const line = (await huyaLines(id)).find(item => item.sCdnType === cdn);
        if (!line) throw new Error("虎牙播放線路已失效");
        return huyaUrl(line);
    }

    async function huyaLiveSource(id) {
        const values = (await huyaLines(id)).map(item => ({n: item.sCdnType, v: getProxyUrl({live: "huya:" + id, cdn: item.sCdnType})}));
        return {parse: 0, url: {values, position: 0}, header: headers("huya"), format: "video/x-flv"};
    }

    async function play(flag, id) {
        const room = roomId(id);
        let result;
        if (room.platform === "douyu") {
            const [source, timeshift] = await net.map([douyuLiveSource, douyuTimeshift], load => load(room.id), 2);
            result = source;
            if (timeshift) result.timeshift = timeshift;
        } else if (room.platform === "yy") {
            result = await yyLiveSource(room.id);
        } else {
            result = await huyaLiveSource(room.id);
        }
        result.position = 0;
        result.danmaku = [{name: "即時彈幕", url: getDanmakuUrl(id)}];
        return result;
    }

    async function proxy(params) {
        if (params.replay) {
            const room = roomId(params.replay);
            if (room.platform !== "douyu") throw new Error("此平台目前不提供回看");
            return [200, "application/json; charset=utf-8", JSON.stringify(await douyuReplay(room.id, params.time)), {"Cache-Control": "no-store"}];
        }
        const room = roomId(params.live);
        async function getUrl() {
            if (room.platform === "yy") return (await yyStreamSource(room.id)).url;
            return room.platform === "douyu" ? douyuUrl(room.id) : huyaStreamUrl(room.id, params.cdn);
        }
        const cacheKey = room.platform === "huya" ? `room:huya:${room.id}` : `stream:${room.platform}:${room.id}`;
        await getUrl();
        const options = {headers: headers(room.platform), timeout: 15000, callTimeout: 0};
        async function open() {
            let reader = await net.openStream(await getUrl(), options);
            if ([401, 403, 404].includes(reader.code)) {
                reader.close();
                net.clearCache(cacheKey);
                reader = await net.openStream(await getUrl(), options);
            }
            if (reader.code !== 200) {
                reader.close();
                throw new Error("直播串流 HTTP " + reader.code);
            }
            return reader;
        }
        const minDuration = room.platform === "douyu" ? 0 : 10000;
        const createNormalizer = room.platform === "yy" ? createYyFlvNormalizer : undefined;
        const response = await net.stream(flvStream(open, minDuration, createNormalizer));
        return [200, "video/x-flv", response.stream, {"Cache-Control": "no-store", "Accept-Ranges": "none"}];
    }

    async function danmaku(id, emit) {
        const room = roomId(id);
        if (room.platform === "yy") {
            const data = await yyRoom(room.id);
            Object.assign(room, {top: String(data.sid), sub: String(data.ssid)});
        } else if (room.platform === "huya") {
            const data = await huyaRoom(room.id);
            if (data.realLiveStatus !== "ON") throw new Error("虎牙主播目前未開播");
            const stream = data.stream?.baseSteamInfoList?.[0];
            if (!stream) throw new Error("虎牙缺少彈幕房間資料");
            Object.assign(room, {uid: stream.lPresenterUid, top: stream.lChannelId, sub: stream.lSubChannelId});
        }
        return subscribe(room.platform, room, emit);
    }

    async function yyGroups() {
        const result = await net.json(YY + "/yyweb/module/data/header", {headers: headers("yy")});
        if (!Array.isArray(result.categoryTabs) || result.categoryTabs.some(item => !Array.isArray(item.navs))) throw new Error("YY分類格式錯誤");
        const items = result.categoryTabs.flatMap(item => item.navs);
        if (!items.length || items.some(item => !Number.isInteger(item.id) || !item.title || typeof item.url !== "string" || !/^https?:\/\/www\.yy\.com\//.test(item.url))) throw new Error("YY分類資料無效");
        return items.map(item => ({id: String(item.id), game: String(item.id), name: item.title, url: item.url.replace(/^http:/, "https:")}));
    }

    async function yyDirectory(game) {
        if (game === "0") return {moduleId: -1, biz: "index", subBiz: "idx"};
        return net.cached(`directory:yy:${game}`, {ttl: 20000, stale: false}, async () => {
            const item = (await groups("yy")).find(item => item.id === game);
            if (!item) throw new Error("未知YY分類");
            const response = await net.http(item.url, {headers: headers("yy")});
            if (response.error || response.code !== 200) throw new Error("YY分類載入失敗：" + (response.error || response.code));
            const source = /pageBar\s*:\s*\{([^}]+)\}/.exec(response.content)?.[1] || "";
            const total = /\btotalCount\s*:\s*(\d+)/.exec(source);
            const module = /\bmoduleId\s*:\s*(-?\d+)/.exec(source);
            const biz = /\bbiz\s*:\s*["']([^"']+)["']/.exec(source);
            const sub = /\bsubBiz\s*:\s*["']([^"']+)["']/.exec(source);
            if (!total || !module || !biz || !sub) throw new Error("YY分類分頁資料無效");
            if (Number(module[1]) === 0 && Number(total[1]) === 0) return {total: 0};
            if (Number(module[1]) <= 0 || biz[1] === "null" || sub[1] === "null") throw new Error("YY分類分頁資料無效");
            return {moduleId: Number(module[1]), biz: biz[1], subBiz: sub[1]};
        });
    }

    async function yyRooms(game, current) {
        const directory = await yyDirectory(game);
        if (directory.total === 0) return page([], current, 60, 0);
        const result = await net.json(YY + "/more/page.action", {params: {...directory, page: current, pageSize: 60}, headers: headers("yy")});
        const data = result.data;
        if (result.resultCode !== 0 || !Number.isSafeInteger(data?.totalCount) || data.totalCount < 0) throw new Error("YY直播列表格式錯誤");
        const count = Math.max(1, Math.ceil(data.totalCount / 60));
        if (current > count || data.data === null && data.totalCount === 0) return page([], current, 60, data.totalCount);
        if (!Array.isArray(data.data)) throw new Error("YY直播列表格式錯誤");
        return page(data.data.map(yyCard), current, 60, data.totalCount);
    }

    async function yySearch(keyword, current) {
        const result = await net.json(YY + "/apiSearch/doSearch.json", {params: {q: keyword, t: 1, n: current, s: 15}, headers: headers("yy")});
        const data = result.data;
        const response = data?.searchResult?.response?.["1"];
        if (result.success !== true || result.status !== 0 || !Number.isInteger(data?.totalPage) || data.totalPage < 0 || !Array.isArray(response?.docs) || !Number.isSafeInteger(response.numFound) || response.numFound < 0) throw new Error("YY搜尋回應格式錯誤");
        const count = Math.max(1, data.totalPage);
        const items = current > count ? [] : response.docs.map(yyCard);
        return {list: items, page: current, pagecount: count, limit: 15, total: response.numFound};
    }

    async function yyRoom(id) {
        return net.cached(`room:yy:${id}`, {ttl: 5000, stale: false}, async () => {
            let [sid, ssid] = id.split("_");
            if (!ssid) {
                const response = await net.http(YY + "/" + sid, {headers: headers("yy")});
                if (response.error || response.code !== 200) throw new Error("YY房間載入失敗：" + (response.error || response.code));
                const source = /\bvar\s+pageInfo\s*=\s*\{([\s\S]*?)\r?\n\s*\};/.exec(response.content)?.[1] || "";
                sid = /\bsid\s*:\s*["'](\d+)["']/.exec(source)?.[1];
                ssid = /\bssid\s*:\s*["'](\d+)["']/.exec(source)?.[1];
                if (!sid || !ssid) throw new Error("YY房間不存在或資料無效");
            }
            const result = await net.json(`${YY}/api/liveInfoDetail/${sid}/${ssid}/0`, {headers: headers("yy")});
            if (result.resultCode !== 0) throw new Error("YY詳情回應錯誤");
            if (!result.data?.sid || !result.data.ssid || !result.data.name) throw new Error("YY目前未開播或房間不存在");
            yyCard(result.data);
            return result.data;
        });
    }

    async function yyStreamSource(id) {
        return net.cached(`stream:yy:${id}`, {ttl: 5000, stale: false}, async () => {
            const room = await yyRoom(id);
            const sid = String(room.sid), ssid = String(room.ssid);
            const stamp = Date.now();
            const version = "5.23.0-beta.2";
            const result = await net.json("https://stream-manager.yy.com/v3/channel/streams", {
                method: "POST", postType: "json", params: {uid: 0, cid: sid, sid: ssid, appid: 0, sequence: stamp, encode: "json"},
                headers: {...headers("yy"), Origin: YY, "Content-Type": "application/json; charset=utf-8"},
                data: {
                    head: {seq: stamp, appidstr: "0", bidstr: "120", cidstr: sid, sidstr: ssid, uid64: 0, client_type: 108, client_ver: version, stream_sys_ver: 1, app: "www.yy.com", playersdk_ver: version, thundersdk_ver: "0", streamsdk_ver: version},
                    client_attribute: {client: "web", model: "web0", cpu: "", graphics_card: "", os: "chrome", osversion: "148.0.0.0", vsdk_version: "", app_identify: "", app_version: "", business: "", width: "1920", height: "1080", scale: "", client_type: 8, h265: 0},
                    avp_parameter: {version: 1, client_type: 8, service_type: 0, imsi: 0, send_time: Math.floor(stamp / 1000), line_seq: -1, gear: 4, ssl: 1, stream_format: 0},
                },
            });
            const url = new URL(yyStreamUrl(result));
            url.searchParams.append("playeruid", "0");
            url.searchParams.append("uuid", deviceId);
            return {parse: 0, url: url.toString(), header: headers("yy"), format: "video/x-flv"};
        });
    }

    async function yyLiveSource(id) {
        return {...await yyStreamSource(id), url: getProxyUrl({live: "yy:" + id})};
    }

    return {init, home, homeVod: () => ({list: []}), category, detail, search, play, proxy, danmaku};
}

function douyuSuccess(code) {
    return code === 0 || code === "0";
}

function pageNumber(value) {
    const numeric = typeof value === "number" || typeof value === "string" && /^-?[0-9]+/.exec(value)?.[0] === value;
    const current = numeric ? Number(value) : NaN;
    if (!Number.isSafeInteger(current)) throw new Error("頁碼格式錯誤");
    return Math.max(1, current);
}

function roomId(value) {
    const match = /^(douyu|huya|yy):([A-Za-z0-9_-]{1,64})$/.exec(value);
    if (!match || match[1] === "yy" && !/^\d+(?:_\d+)?$/.test(match[2])) throw new Error("直播房間編號格式錯誤");
    return {platform: match[1], id: match[2]};
}

function headers(platform) {
    return {"User-Agent": UA, Referer: (platform === "douyu" ? DOUYU : platform === "yy" ? YY : HUYA) + "/"};
}

function image(value) {
    return typeof value === "string" ? value.replace(/^\/\//, "https://") : "";
}

function card(platform, id, name, pic, remark) {
    if (!id || !name) throw new Error("直播列表缺少房間編號或名稱");
    return {vod_id: `${platform}:${id}`, vod_name: String(name), vod_pic: image(pic), vod_remarks: remark || "", style: STYLE};
}

function yyCard(item) {
    const sid = String(item.sid ?? ""), ssid = item.ssid == null ? "" : String(item.ssid);
    if (!/^\d+$/.test(sid) || item.ssid != null && !/^\d+$/.test(ssid)) throw new Error("YY房間編號無效");
    const offline = String(item.liveOn) === "0";
    return card("yy", ssid ? `${sid}_${ssid}` : sid, item.desc || item.name, item.thumb2 || item.thumb || item.headurl || item.avatar, (item.name || "") + (offline ? " · 未開播" : ""));
}

function yyStreamUrl(result) {
    const code = Object.hasOwn(result, "result") ? result.result : 0;
    const streams = result.channel_stream_info?.streams;
    const addresses = result.avp_info_res?.stream_line_addr || {};
    if (code !== 0 || !Array.isArray(streams) || typeof addresses !== "object" || Array.isArray(addresses)) throw new Error("YY播放資料無效");
    for (const item of streams) {
        if (item.type !== 2) continue;
        const info = JSON.parse(item.json);
        if (info.is_cdn !== 1 || info.encoderType !== 100) continue;
        const url = addresses[`${item.appidstr}_${item.stream_name}`]?.cdn_info?.url;
        if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
    }
    throw new Error("YY目前沒有可播放的直播");
}

function huyaUrl(stream) {
    const params = new URLSearchParams(stream.sFlvAntiCode);
    const template = atob(params.get("fm") || "");
    if (!template.includes("$0_$1_$2_$3")) throw new Error("虎牙播放簽名格式已改變");
    const stamp = Date.now();
    const seqid = String(stamp);
    const hash = md5X(`${seqid}|${params.get("ctype")}|${params.get("t")}`);
    const secret = template.replaceAll("$0", "0").replaceAll("$1", stream.sStreamName).replaceAll("$2", hash).replaceAll("$3", params.get("wsTime"));
    params.delete("fm");
    for (const [key, value] of Object.entries({wsSecret: md5X(secret), u: "0", seqid, ver: "1", uuid: String(stamp % 4294967295), sdk_sid: String(stamp)})) params.set(key, value);
    return `${stream.sFlvUrl}/${stream.sStreamName}.${stream.sFlvUrlSuffix}?${params}`;
}
