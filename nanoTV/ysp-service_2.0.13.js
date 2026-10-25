/* nanoTV-declaration
{
  "declarationVersion": 1,
  "manifest": {
    "id": "ysp-live",
    "name": "YSP Live v9.5",
    "version": "2.0.13",
    "apiVersion": 2,
    "externalXMLTV": [
      "https://epg.zsdc.eu.org/t.xml.gz",
      "https://epg.pw/xmltv/epg_CN.xml.gz"
    ],
    "networkHosts": [
      ".cctv.cn",
      ".cctv.com",
      ".cctvpic.com",
      ".citvc.com",
      ".yangshipin.cn",
      ".cntv.cn",
      ".cntv.com",
      ".myqcloud.com",
      ".qqlive.com",
      ".gtimg.cn",
      ".smtcdns.net",
      ".smtcdns.com",
      ".tcdnlive.com",
      ".alicdn.com",
      ".alikunlun.com",
      ".wscdns.com",
      ".chinanetcenter.com",
      ".bdydns.com",
      ".ksyungslb.com",
      ".ks-cdn.com"
    ],
    "capabilities": [
      "http",
      "crypto",
      "storage",
      "scheduler",
      "media.hls"
    ]
  },
  "permissions": {
    "capabilities": [
      "http",
      "crypto",
      "storage",
      "scheduler",
      "media.hls"
    ],
    "networkHosts": [
      ".cctv.cn",
      ".cctv.com",
      ".cctvpic.com",
      ".citvc.com",
      ".yangshipin.cn",
      ".cntv.cn",
      ".cntv.com",
      ".myqcloud.com",
      ".qqlive.com",
      ".gtimg.cn",
      ".smtcdns.net",
      ".smtcdns.com",
      ".tcdnlive.com",
      ".alicdn.com",
      ".alikunlun.com",
      ".wscdns.com",
      ".chinanetcenter.com",
      ".bdydns.com",
      ".ksyungslb.com",
      ".ks-cdn.com"
    ],
    "credentialHosts": [
      ".cctv.cn",
      ".cctv.com",
      ".cctvpic.com",
      ".citvc.com",
      ".yangshipin.cn",
      ".cntv.cn",
      ".cntv.com",
      ".myqcloud.com",
      ".qqlive.com",
      ".gtimg.cn",
      ".smtcdns.net",
      ".smtcdns.com",
      ".tcdnlive.com",
      ".alicdn.com",
      ".alikunlun.com",
      ".wscdns.com",
      ".chinanetcenter.com",
      ".bdydns.com",
      ".ksyungslb.com",
      ".ks-cdn.com"
    ],
    "mediaHosts": [
      ".cctv.cn",
      ".cctv.com",
      ".cctvpic.com",
      ".citvc.com",
      ".yangshipin.cn",
      ".cntv.cn",
      ".cntv.com",
      ".myqcloud.com",
      ".qqlive.com",
      ".gtimg.cn",
      ".smtcdns.net",
      ".smtcdns.com",
      ".tcdnlive.com",
      ".alicdn.com",
      ".alikunlun.com",
      ".wscdns.com",
      ".chinanetcenter.com",
      ".bdydns.com",
      ".ksyungslb.com",
      ".ks-cdn.com"
    ],
    "mediaCredentialHosts": [
      ".cctv.cn",
      ".cctv.com",
      ".cctvpic.com",
      ".citvc.com",
      ".yangshipin.cn",
      ".cntv.cn",
      ".cntv.com",
      ".myqcloud.com",
      ".qqlive.com",
      ".gtimg.cn",
      ".smtcdns.net",
      ".smtcdns.com",
      ".tcdnlive.com",
      ".alicdn.com",
      ".alikunlun.com",
      ".wscdns.com",
      ".chinanetcenter.com",
      ".bdydns.com",
      ".ksyungslb.com",
      ".ks-cdn.com"
    ]
  },
  "configurationSchema": [],
  "stateSchemaVersion": 1,
  "requires": {
    "hostSDK": "2.2"
  }
}

*/
/*
 * 免责声明与使用说明
 *
 * 本脚本基于 YSP v9.5 Python 脚本改写。
 * 感谢 Gary's Club 提供原始脚本：https://t.me/garysclub
 * 本脚本仅供学习研究、功能验证与测试，请勿用于其他用途。
 *
 * NanoTV 宿主仅提供通用脚本运行环境与解析接口。
 * YSP 相关认证流程与协议算法由本脚本实现或引用，
 * 频道信息、频道列表及播放地址来自第三方服务。
 *
 * 原脚本及相关第三方内容的权利归各自权利人所有。
 * 使用本脚本不代表获得相关服务或内容的访问、播放或传播授权，
 * 请在取得必要授权并遵守第三方服务使用规则的前提下使用。
 */

/*
 * ===================================================================
 *  YSP Live —— 脚本导读
 * ===================================================================
 *
 * 一、脚本介绍（按出现顺序）
 *
 *   ① 服务入口    createYSPService      ← 紧接本导读；注册 nanoService，宿主只认这个对象
 *   ② BK 协议     createBKProtocol      BK 签名（cKey / TEA）与直播解析，兜底来源
 *   ③ Device 协议 createDeviceProtocol  电视投屏设备协议（设备身份、注册、心跳、VDN 签名）
 *   ④ JCE 协议    createJCEProtocol     JCE/QMF 二进制协议（直播窗口与回看）
 *   ⑤ 频道表      createChannelTable    频道数据、别名、回看频道、固定走 BK 的频道
 *
 *   ②～⑤ 是脚本内部模块，只给 ① 使用；宿主不会直接调用它们。
 *   整个文件包在一个私有作用域里，只有 nanoService 挂到全局。
 *
 * 二、两个方向的接口
 *
 *   宿主调用脚本（脚本实现，都在 ① nanoService 上；① 开头的 return 列出了各自的实现函数）
 *     start(host)               脚本启动：载入或创建设备身份，注册 30 秒心跳
 *     channels()                返回频道列表（含是否支持回看）
 *     resolve(request, host)    播放或回看某频道：选来源 → 解析上游 → 开媒体会话
 *     mediaActivity(event)      播放器活动 / 关闭 / 需要重开的通知
 *     status()                  诊断状态（设备会话、冷却、最近失败）
 *     stop(host)                停止：保存身份，清空缓存
 *     testing                   仅供测试，宿主不调用
 *
 *   脚本调用宿主（宿主提供，统一叫 host）
 *     host.http.request         发上游请求（Device、JCE 使用）
 *     native.http               host.http 的底层通道；BK 模块沿用 v1 写法直接调用它
 *     host.crypto / host.bytes  摘要、AES-GCM、RSA、gzip、编码转换
 *     host.storage              持久化：identity（设备身份）、jce-guid
 *     host.scheduler            定时心跳、JCE 请求间隔
 *     host.media.openHLS        创建本地播放会话，返回给播放器的地址
 *     host.now / host.randomHex / host.log
 *
 * 三、resolve 怎么选来源（① 中的 resolveSource()）
 *
 *   请求带回看时间窗                → 只走 JCE；频道不支持回看则报 422
 *   source=jce / bk / device        → 强制走对应来源
 *   auto，频道有 Device ID 且不在 FORCE_BK_IDS
 *                                   → Device；失败自动退 BK
 *   auto，频道支持回看且 JCE 未冷却  → JCE 直播窗口；失败冷却 5 分钟并退 BK
 *   其他                            → BK
 *
 *   解析结果按「频道 + 来源 + 码率 + 时间窗」缓存；同一请求并发时共用一次解析，
 *   同时最多 8 个解析。
 *
 
 */
(function (g) {
    "use strict";

    /*
     * ① 服务入口 —— 宿主只通过 nanoService 调用脚本。
     *
     * 本文件开头先注册 nanoService，并列出宿主会调用的方法各对应哪个函数；
     * 往下依次是这些函数的实现、来源选择（Device / BK / JCE）、解析结果缓存与媒体会话登记。
     * 各协议细节在后面的 createBKProtocol / createDeviceProtocol / createJCEProtocol 中，
     * 频道数据在 createChannelTable 中。接口约定见 docs/SCRIPT-API-V2.md。
     */

    // 注册：组装内部模块，生成宿主调用的 nanoService。
    g.nanoService = createYSPService({
        channels: createChannelTable(),
        bk: createBKProtocol(),
        device: createDeviceProtocol(),
        jce: createJCEProtocol(),
    });

    function createYSPService({ channels, bk, device, jce }) {
        // 允许访问的上游 / CDN 域名，须与声明块 networkHosts 一致。
        // prettier-ignore
        const HOSTS = [
            ".cctv.cn", ".cctv.com", ".cctvpic.com", ".citvc.com", ".yangshipin.cn", ".cntv.cn", ".cntv.com",
            ".myqcloud.com", ".qqlive.com", ".gtimg.cn", ".smtcdns.net", ".smtcdns.com", ".tcdnlive.com",
            ".alicdn.com", ".alikunlun.com", ".wscdns.com", ".chinanetcenter.com", ".bdydns.com", ".ksyungslb.com",
            ".ks-cdn.com",
        ];
        // 运行期状态：
        //   cache        resolveSource() 的解析结果，键 = 频道|来源|码率|时间窗
        //   pending      正在进行的解析，并发同键请求共用
        //   mediaCache   已开的媒体会话，键 = 频道|原始查询参数
        //   mediaSources 会话 ID → 来源，用于分发 mediaActivity
        //   jceCooldown  频道 → JCE 冷却截止时间（毫秒）
        const cache = new Map(),
            pending = new Map(),
            mediaCache = new Map(),
            mediaSources = new Map(),
            jceCooldown = new Map();
        let host;

        // =================================================================
        //  宿主调用的接口：方法名由契约规定，右边是本脚本里的实现函数
        // =================================================================
        return {
            // 须与文件开头的声明块一致，宿主会校验。
            manifest: {
                id: "ysp-live",
                name: "YSP Live v9.5",
                version: "2.0.13",
                apiVersion: 2,
                externalXMLTV: ["https://epg.zsdc.eu.org/t.xml.gz", "https://epg.pw/xmltv/epg_CN.xml.gz"],
                networkHosts: HOSTS,
                capabilities: ["http", "crypto", "storage", "scheduler", "media.hls"],
                excludes: [
                    "companion Node/WASM",
                    "Python 120-segment byte buffer (host rolling window instead)",
                    "seamless source upgrade",
                    "DRM license",
                    "verified 4K/8K decoding",
                ],
            },
            // 契约必需：channels、resolve；其余可选，本脚本都实现了。
            start: startService, //             启动时调用一次（载入设备身份、注册心跳）
            channels: listChannels, //          频道列表
            resolve: resolvePlayback, //        播放 / 回看解析
            mediaActivity: onMediaActivity, //  播放器活动通知
            status: serviceStatus, //           诊断状态
            stop: stopService, //               停止时调用
            // 仅供测试（V2ProtocolTests、verify-ysp-window），宿主不调用。
            testing: Object.assign({}, bk.testing, {
                device: device.testing,
                jce: jce.testing,
                time,
                windowQuery,
                modules: { channels, bk, device, jce },
            }),
        };

        // 以下是函数声明（会被提升），上面的 return 可以直接引用它们。

        // ---- 生命周期 ----
        function startService(h) {
            host = h;
            device.start(h);
            jce.start(h);
        }
        // 保存设备身份并清空所有缓存。
        function stopService(h) {
            device.stop();
            cache.clear();
            pending.clear();
            mediaCache.clear();
            mediaSources.clear();
            jceCooldown.clear();
        }
        function serviceStatus() {
            return device.status();
        }

        // ---- channels：频道表投影成宿主需要的字段 ----
        function listChannels() {
            return channels.list.map((c) => ({
                id: c.id,
                name: c.name,
                group: c.group,
                logo: c.logo,
                tvgID: c.tvgID,
                definition: c.definition,
                quality: c.quality,
                catchup: channels.catchup.has(c.id),
                catchupWindow: channels.catchup.has(c.id) ? { maxLookbackSeconds: 604800 } : undefined,
                device: !!device.liveIDs[c.id],
            }));
        }

        // ---- mediaActivity：Device 来源用于保活；JCE 窗口要求重开时进入冷却并清缓存 ----
        function onMediaActivity(event) {
            const context = mediaSources.get(event.sessionID);
            if (context?.source === "device") device.mediaActivity(event);
            if (event.kind === "reopenRequired" && context?.liveWindow) {
                jceCooldown.set(context.channelID, host.now() + 300000);
                for (const [key, value] of cache)
                    if (key.startsWith(context.channelID + "|") && value.result.liveWindow) cache.delete(key);
                for (const key of mediaCache.keys()) if (key.startsWith(context.channelID + "|")) mediaCache.delete(key);
            }
            if (event.kind === "closed") mediaSources.delete(event.sessionID);
        }

        // ---- 工具：回看时间参数解析 ----
        function error(message, status = 400) {
            const e = new Error(message);
            e.status = status;
            return e;
        }
        function time(value) {
            if (value === undefined || value === null || value === "") return null;
            const s = String(value).trim();
            if (/^\d{10}$/.test(s)) return Number(s);
            if (/^\d{13}$/.test(s)) return Math.floor(Number(s) / 1000);
            const compact = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(Z)?$/i.exec(s);
            let normalized = s;
            if (compact) {
                const [, y, m, d, h, n, sec, z] = compact;
                normalized = y + "-" + m + "-" + d + "T" + h + ":" + n + ":" + (sec || "00") + (z ? "Z" : "+08:00");
            } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
                normalized = s.replace(" ", "T");
                if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) normalized += "+08:00";
            } else throw error("Invalid catchup time");
            const dateParts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(normalized);
            if (
                !dateParts ||
                Number(dateParts[2]) < 1 ||
                Number(dateParts[2]) > 12 ||
                Number(dateParts[3]) < 1 ||
                Number(dateParts[3]) > new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]), 0)).getUTCDate() ||
                Number(dateParts[4]) > 23 ||
                Number(dateParts[5]) > 59 ||
                Number(dateParts[6] || 0) > 59
            )
                throw error("Invalid calendar date");
            const n = Date.parse(normalized);
            if (!Number.isFinite(n)) throw error("Invalid catchup time");
            return Math.floor(n / 1000);
        }
        // 从查询参数取回看窗口（start/end、utc/lutc、playseek 等写法），没有则返回 null 表示直播。
        function windowQuery(q, now) {
            let a = q.start ?? q.utc ?? q.starttime,
                b = q.end ?? q.lutc ?? q.endtime;
            if (q.playseek) {
                const match = /^(\d{10,14}Z?)-(\d{10,14}Z?)$/i.exec(q.playseek);
                if (match) {
                    a = match[1];
                    b = match[2];
                } else a = q.playseek;
            }
            if (a === undefined && b === undefined) return null;
            const start = time(a);
            if (start === null) throw error("Catchup requires a start time");
            const end = b === undefined ? Math.max(start + 60, now) : time(b);
            if (
                !Number.isSafeInteger(start) ||
                !Number.isSafeInteger(end) ||
                start < 0 ||
                end <= start ||
                start > now ||
                end > now + 60
            )
                throw error("Catchup requires an ordered window");
            return { start, end };
        }
        // ---- 各来源的薄包装：补上过期时间与来源标记 ----
        async function resolveBK(channel) {
            const r = await bk.resolve(channel);
            if (!r.ok) throw error(r.error, 502);
            return Object.assign({}, r, {
                source: "BK live",
                expiresAt: host.now() / 1000 + 300,
                resolutionVerified: false,
            });
        }
        // JCE 直播窗口：取「现在-120 秒」到「现在+900 秒」，交给宿主做滚动窗口播放。
        async function resolveJCELive(channel) {
            const now = Math.floor(host.now() / 1000),
                end = now + 900;
            const result = await jce.resolve(channel, now - 120, end);
            return Object.assign({}, result, {
                expiresAt: end - 60,
                liveWindow: { playlistSegments: 6, holdbackSegments: 1, minPollSeconds: 5 },
            });
        }
        // The host retries reanchoring on every poll; a failed refresh must not turn into a jacc call per poll.
        async function refreshJCELive(channel) {
            if ((jceCooldown.get(channel.id) || 0) > host.now()) throw error("JCE live window cooling down", 503);
            try {
                return await resolveJCELive(channel);
            } catch (e) {
                jceCooldown.set(channel.id, host.now() + 300000);
                host.log("JCE fallback channel=" + channel.id + " stage=refresh");
                throw e;
            }
        }
        // ---- 来源选择 + 结果缓存（选择规则见文件开头导读第三节）----
        // force=true 时跳过缓存，供媒体会话 refresh 使用。
        async function resolveSource(channel, q, force = false) {
            const source = q.source || "auto";
            if (!["auto", "device", "bk", "jce"].includes(source)) throw error("Unknown source");
            const window = windowQuery(q, Math.floor(host.now() / 1000));
            if (window && !channels.catchup.has(channel.id)) throw error("Catchup is unavailable for this channel", 422);
            if (window && ["device", "bk"].includes(source)) throw error("Catchup requires JCE source", 422);
            const key =
                channel.id +
                "|" +
                source +
                "|" +
                (q.rate || "36p") +
                "|" +
                (window ? window.start + ":" + window.end : "live");
            const saved = cache.get(key);
            if (
                !force &&
                saved &&
                saved.until > host.now() / 1000 &&
                saved.result.expiresAt > host.now() / 1000 + 5 &&
                !(source === "auto" && saved.result.liveWindow && (jceCooldown.get(channel.id) || 0) > host.now())
            )
                return saved.result;
            if (pending.has(key)) return pending.get(key);
            if (pending.size >= 8) throw error("Resolver concurrency limit reached", 503);
            const task = (async () => {
                let result;
                if (window || source === "jce") {
                    if (!channels.catchup.has(channel.id)) throw error("JCE is unavailable for this channel", 422);
                    const now = Math.floor(host.now() / 1000);
                    result = await jce.resolve(channel, window ? window.start : now - 300, window ? window.end : now);
                } else if (source === "bk") result = await resolveBK(channel);
                else if (source === "device") result = await device.resolve(channel, q.rate || "36p");
                else if (device.liveIDs[channel.id] && !channels.forceBK.has(channel.id)) {
                    try {
                        result = await device.resolve(channel, q.rate || "36p");
                    } catch (e) {
                        host.log(
                            "DEVICE fallback channel=" +
                            channel.id +
                            " stage=" +
                            (e.stage || "device") +
                            " code=" +
                            (e.code ?? "none") +
                            " business=" +
                            (e.businessCode ?? "none"),
                        );
                        result = await resolveBK(channel);
                        result.fallback = {
                            from: "device",
                            stage: e.stage || "device",
                            code: e.code ?? null,
                            httpStatus: e.httpStatus ?? null,
                            businessCode: e.businessCode ?? null,
                            retryAt: host.now() / 1000 + Math.max(5, device.status().cooldown / 1000),
                            cause: device.status().lastFailure,
                            reason: String(e.message)
                                .replace(/https?:\/\/[^\s]+/g, "[URL]")
                                .slice(0, 200),
                        };
                    }
                } else if (channels.catchup.has(channel.id) && (jceCooldown.get(channel.id) || 0) <= host.now()) {
                    try {
                        result = await resolveJCELive(channel);
                    } catch (e) {
                        jceCooldown.set(channel.id, host.now() + 300000);
                        host.log("JCE fallback channel=" + channel.id + " stage=jce");
                        result = await resolveBK(channel);
                        result.fallback = {
                            from: "JCE",
                            stage: "jce",
                            retryAt: host.now() / 1000 + 300,
                            reason: "JCE live window unavailable",
                        };
                    }
                } else {
                    result = await resolveBK(channel);
                    if (channels.catchup.has(channel.id) && (jceCooldown.get(channel.id) || 0) > host.now())
                        result.fallback = {
                            from: "JCE",
                            stage: "jce",
                            retryAt: jceCooldown.get(channel.id) / 1000,
                            reason: "JCE live window cooling down",
                        };
                }
                if (window) result.window = window;
                result.channel = { id: channel.id, name: channel.name };
                result.allowedHosts = HOSTS;
                // These CDN domains are explicitly part of this source's signed playback context.
                result.credentialHosts = HOSTS;
                cache.set(key, {
                    result,
                    until: result.fallback ? Math.min(result.expiresAt, result.fallback.retryAt) : result.expiresAt,
                });
                if (cache.size > 128) cache.delete(cache.keys().next().value);
                return result;
            })().finally(() => pending.delete(key));
            pending.set(key, task);
            return task;
        }
        // ---- resolve：播放 / 回看解析 ----
        // 流程：校验频道 → resolveSource() 解析上游 → 复用或新开 host.media.openHLS 会话 → 返回播放结果。
        async function resolvePlayback(request, h) {
            const channel = channels.find(request.channelID);
            if (!channel) throw error("Unknown channel", 404);
            const q = request.query || {};
            const raw = await resolveSource(channel, q);
            const key = channel.id + "|" + JSON.stringify(q);
            let media = mediaCache.get(key);
            const binding = JSON.stringify({ url: raw.url, headers: raw.headers, source: raw.source });
            if (
                !media ||
                !h.media.isOpen(media.sessionID) ||
                media.expiresAt <= h.now() / 1000 ||
                media.binding !== binding
            ) {
                const options = {
                    channelID: channel.id,
                    manifestURL: raw.url,
                    headers: raw.headers,
                    allowedHosts: HOSTS,
                    credentialHosts: HOSTS,
                    expiresAt: raw.expiresAt,
                    refresh: async () => {
                        const next = raw.liveWindow
                            ? await refreshJCELive(channel)
                            : await resolveSource(
                                channel,
                                Object.assign({}, q, {
                                    source: raw.source === "BK live" ? "bk" : raw.source === "device" ? "device" : "jce",
                                }),
                                true,
                            );
                        if (next.source !== raw.source) throw error("Source changed; resolve a new media session", 409);
                        const update = Object.assign({}, next, { manifestURL: next.url });
                        if (!raw.liveWindow) update.manifestURLs = next.candidates;
                        return update;
                    },
                };
                if (raw.liveWindow) options.liveWindow = raw.liveWindow;
                else {
                    options.manifestURLs = raw.candidates;
                    if (raw.source === "BK live") options.validateFirstSegment = true;
                }
                const opened = h.media.openHLS(options);
                mediaSources.set(opened.sessionID, {
                    source: raw.source,
                    channelID: channel.id,
                    liveWindow: !!raw.liveWindow,
                });
                media = Object.assign(opened, { expiresAt: h.now() / 1000 + 90, binding });
                mediaCache.set(key, media);
                if (mediaCache.size > 32) {
                    const oldest = mediaCache.keys().next().value;
                    mediaCache.delete(oldest);
                }
            }
            const result = Object.assign({}, raw, media, {
                expiresAt: raw.expiresAt,
                resolvedAt: new Date(h.now()).toISOString(),
            });
            delete result.binding;
            return result;
        }
    }

    /*
     * ② BK 协议 createBKProtocol() —— 脚本内部模块，只由服务入口调用，宿主不直接调用。
     *
     * BK 直播解析 resolveChannel()：生成 cKey 签名，请求 bkliveinfo，返回候选播放地址。
     * BK 是兜底来源：Device / JCE 不可用时由服务入口回退到这里。
     * 签名算法改编自 ysp-live-v9.5.py（BK 部分第 2218–2292 行）。
     */
    function createBKProtocol() {
        // ---- BK 协议常量 ----
        var PLATFORM = 4330403;
        var APP_VERSION = "V8.22.1035.3031";
        var TEA_KEY = fromHex("59b2f7cf725ef43c34fdd7c123411ed3");
        var GUARD_KEY = fromHex("110dbec10c23e7d2e56a1cad6914ef1b");
        var KEY_XOR = [132, 46, 237, 8, 240, 102, 230, 234, 72, 180, 202, 169, 145, 237, 111, 243];
        var GUARD_XOR = [179, 201, 83, 160, 105, 19, 173, 77];
        var PLAYBACK_HEADERS = { "User-Agent": "qqlive", "Referer": "https://live.cctv.cn/" };

        // ---- 字节工具 ----
        function fromHex(hex) {
            if (typeof hex !== "string" || hex.length % 2 || !/^[0-9a-f]*$/i.test(hex)) {
                throw new Error("Invalid hexadecimal bytes");
            }
            var result = [];
            for (var i = 0; i < hex.length; i += 2) result.push(parseInt(hex.slice(i, i + 2), 16));
            return result;
        }
        function toHex(bytes) {
            return bytes
                .map(function (byte) {
                    return (byte < 16 ? "0" : "") + byte.toString(16);
                })
                .join("");
        }
        function utf8(value) {
            var encoded = encodeURIComponent(String(value));
            var result = [];
            for (var i = 0; i < encoded.length; i++) {
                if (encoded[i] === "%") {
                    result.push(parseInt(encoded.slice(i + 1, i + 3), 16));
                    i += 2;
                } else result.push(encoded.charCodeAt(i));
            }
            return result;
        }
        function u32(value) {
            return value >>> 0;
        }
        function uint32(bytes, offset) {
            return u32((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);
        }
        function be32(value) {
            value = u32(value);
            return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
        }
        function lp(value) {
            var bytes = typeof value === "string" ? utf8(value) : value;
            if (bytes.length > 65535) throw new Error("Signature field too long");
            return [bytes.length >>> 8, bytes.length & 255].concat(bytes);
        }
        // ---- cKey 签名：TEA 加密 + 校验和（guard → createCKey）----
        function checksum(bytes) {
            var value = 0;
            for (var i = 0; i < bytes.length; i++) value = (131 * value + bytes[i]) & 0x7fffffff;
            return value;
        }
        function teaBlock(block, key) {
            if (block.length !== 8 || key.length !== 16) throw new Error("Invalid TEA block/key size");
            var y = uint32(block, 0),
                z = uint32(block, 4),
                sum = 0;
            var k = [uint32(key, 0), uint32(key, 4), uint32(key, 8), uint32(key, 12)];
            for (var round = 0; round < 16; round++) {
                sum = u32(sum + 0x9e3779b9);
                y = u32(y + u32(u32(u32(z << 4) + k[0]) ^ u32(z + sum) ^ u32((z >>> 5) + k[1])));
                z = u32(z + u32(u32(u32(y << 4) + k[2]) ^ u32(y + sum) ^ u32((y >>> 5) + k[3])));
            }
            return be32(y).concat(be32(z));
        }
        function xorBytes(a, b) {
            return a.map(function (byte, i) {
                return byte ^ b[i];
            });
        }
        function teaPacket(data, key, randomBytes) {
            var pad = (8 - ((data.length + 10) % 8)) % 8;
            var plain = [(randomBytes(1)[0] & 248) | pad].concat(
                randomBytes(pad),
                randomBytes(2),
                data,
                [0, 0, 0, 0, 0, 0, 0],
            );
            var output = [],
                previousPlain = [0, 0, 0, 0, 0, 0, 0, 0],
                previousCipher = previousPlain.slice();
            for (var offset = 0; offset < plain.length; offset += 8) {
                var mixed = xorBytes(plain.slice(offset, offset + 8), previousCipher);
                var cipher = xorBytes(teaBlock(mixed, key), previousPlain);
                output = output.concat(cipher);
                previousPlain = mixed;
                previousCipher = cipher;
            }
            return output;
        }
        function base64(bytes) {
            var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var output = "";
            for (var i = 0; i < bytes.length; i += 3) {
                var a = bytes[i],
                    b = bytes[i + 1],
                    c = bytes[i + 2];
                output += alphabet[a >>> 2];
                output += alphabet[((a & 3) << 4) | (b === undefined ? 0 : b >>> 4)];
                output += b === undefined ? "=" : alphabet[((b & 15) << 2) | (c === undefined ? 0 : c >>> 6)];
                output += c === undefined ? "=" : alphabet[c & 63];
            }
            return output;
        }
        function guard(timestamp, guid, randomBytes) {
            function tail(value) {
                return value.length >= 5 ? value.slice(-5) : "";
            }
            var body = be32(timestamp).concat(lp(tail(guid)), lp(tail("null")), lp(tail("null")), lp("-1"));
            var plain = lp(body);
            var encrypted = teaPacket(plain, GUARD_KEY, randomBytes).concat(be32(checksum(plain)));
            return toHex(
                encrypted.map(function (byte, i) {
                    return byte ^ GUARD_XOR[i & 7];
                }),
            ).toUpperCase();
        }
        function createCKey(channelID, timestamp, randomBytes) {
            var guid = toHex(randomBytes(16));
            var signatureGuard = guard(timestamp, guid, randomBytes);
            var uid = toHex(randomBytes(4)).toUpperCase();
            var body = fromHex("0000004200000004000004d2").concat(
                be32(PLATFORM),
                be32(0),
                be32(timestamp),
                lp("dcgh"),
                lp("_zj1A5Gh6QYcxWjIUGos2w=="),
                lp(APP_VERSION),
                lp(String(channelID)),
                lp(guid),
                be32(1),
                be32(1),
                lp(uid),
                lp("nil"),
                lp("57eab0c4-2c58-44c6-8ae9-dd2757525dc5"),
                lp("nil"),
                lp("v0.1.000"),
                lp("com.cctv.yangshipin.app.iphone"),
                lp(String(PLATFORM)),
                lp("ex_json_bus"),
                lp("ex_json_vs"),
                lp(signatureGuard),
            );
            var packet = lp(body);
            var packetChecksum = be32(checksum(packet));
            for (var i = 0; i < 4; i++) packet[18 + i] = packetChecksum[i];
            var encrypted = teaPacket(packet, TEA_KEY, randomBytes).concat(be32(checksum(packet)));
            encrypted = encrypted.map(function (byte, index) {
                return byte ^ KEY_XOR[index & 15];
            });
            var uuid = randomBytes(16);
            uuid[6] = (uuid[6] & 15) | 64;
            uuid[8] = (uuid[8] & 63) | 128;
            return {
                cKey: "--01" + base64(encrypted).replace(/\+/g, "_").replace(/\//g, "-").replace(/=+$/, ""),
                guid: guid,
                ts: timestamp,
                flowId: toHex(uuid).toUpperCase() + "_" + PLATFORM,
            };
        }
        // ---- 请求构造与网络（直接用宿主底层 native.http / native.randomHex）----
        function nativeRandomBytes(count) {
            if (count === 0) return [];
            var hex = native.randomHex(count);
            if (typeof hex !== "string" || hex.length !== count * 2) throw new Error("宿主随机数长度不正确");
            return fromHex(hex);
        }
        function formEncode(value) {
            return encodeURIComponent(String(value))
                .replace(/[!'()*]/g, function (char) {
                    return "%" + char.charCodeAt(0).toString(16).toUpperCase();
                })
                .replace(/%20/g, "+");
        }
        function queryString(values) {
            return Object.keys(values)
                .map(function (key) {
                    return formEncode(key) + "=" + formEncode(values[key]);
                })
                .join("&");
        }
        function upstreamRequest(channel) {
            var key = createCKey(channel.channelID, Math.floor(Date.now() / 1000), nativeRandomBytes);
            var values = {
                atime: "120",
                livepid: channel.livePID,
                cnlid: channel.channelID,
                appVer: APP_VERSION,
                app_version: "300090",
                caplv: "1",
                cmd: "2",
                defn: channel.definition,
                device: "iPhone",
                encryptVer: "4.2",
                getpreviewinfo: "0",
                hevclv: "0",
                lang: "zh-Hans_CN",
                livequeue: "0",
                logintype: "1",
                nettype: "1",
                newnettype: "1",
                newplatform: String(PLATFORM),
                platform: String(PLATFORM),
                sdtfrom: "v3021",
                spacode: "23",
                spaudio: "1",
                spdemuxer: "6",
                spdrm: "2",
                spdynamicrange: "1",
                spflv: "1",
                spflvaudio: "1",
                sphdrfps: "60",
                sphttps: "1",
                spvcode: base64(utf8("H(30:1080,60:1080|30:1080,60:1080)")),
                spvideo: "4",
                stream: "1",
                system: "1",
                sysver: "ios18.2.1",
                uhd_flag: "0",
                cKey: key.cKey,
                guid: key.guid,
                fntick: String(key.ts),
                flowid: key.flowId,
                playbacktime: "0",
            };
            return {
                url: "https://bkliveinfo.ysp.cctv.cn/?" + queryString(values),
                method: "GET",
                headers: { "User-Agent": "qqlive", "Accept": "application/json" },
                timeoutSeconds: 15,
            };
        }
        function sanitizedDiagnostic(value) {
            return String(value || "源站网络请求失败")
                .replace(/https?:\/\/[^\s"'<>]+/gi, function (url) {
                    var authority = /^https?:\/\/[^\/?#]+/i.exec(url);
                    return authority ? authority[0] + "/[redacted]" : "[redacted-url]";
                })
                .replace(/\b(cKey|flowid|APPSIGN|token|sig|signature)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
                .replace(/[\u0000-\u001f\u007f]+/g, " ")
                .slice(0, 400);
        }
        function http(request) {
            return new Promise(function (resolve, reject) {
                try {
                    native.http(JSON.stringify(request), function (responseJSON) {
                        var response;
                        try {
                            response = JSON.parse(responseJSON);
                        } catch (_) {
                            reject(new Error("宿主返回了无效网络响应"));
                            return;
                        }
                        if (!response || typeof response !== "object") {
                            reject(new Error("宿主返回了无效网络响应"));
                            return;
                        }
                        if (!response.ok) {
                            reject(new Error(sanitizedDiagnostic(response.error)));
                            return;
                        }
                        resolve(response);
                    });
                } catch (error) {
                    reject(new Error(sanitizedDiagnostic(error.message || error)));
                }
            });
        }

        // ---- 播放地址校验：只接受央视域名下的 HTTP(S) 地址 ----
        // Parse only an HTTP(S) authority for validation. Never reconstruct a signed
        // URL: its original escaping and query byte order must remain unchanged.
        function playbackHost(url) {
            if (typeof url !== "string" || /[\s\u0000-\u001f\u007f\\]/.test(url)) return null;
            var match = /^(https?):\/\/([^\/?#]+)(?:[\/?#]|$)/i.exec(url);
            if (!match || match[2].indexOf("@") !== -1 || match[2].indexOf("%") !== -1) return null;
            var authority = match[2].toLowerCase();
            var parts = /^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(authority);
            if (!parts || (parts[2] && (Number(parts[2]) < 1 || Number(parts[2]) > 65535))) return null;
            var host = parts[1];
            if (
                host.length > 253 ||
                host.split(".").some(function (label) {
                    return !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
                })
            )
                return null;
            var suffixes = ["cctv.cn", "cctv.com", "cctvpic.com", "citvc.com", "yangshipin.cn", "cntv.cn", "cntv.com"];
            return suffixes.some(function (suffix) {
                return host === suffix || host.slice(-(suffix.length + 1)) === "." + suffix;
            })
                ? host
                : null;
        }
        function isAllowedPlaybackURL(url) {
            return playbackHost(url) !== null;
        }
        function collectCandidates(payload) {
            var all = [];
            if (typeof payload.playurl === "string") all.push(payload.playurl);
            var backup = payload.backurl_list || payload.backurlList || payload.backurl;
            if (Array.isArray(backup))
                backup.forEach(function (item) {
                    if (typeof item === "string") all.push(item);
                    else if (item && typeof item === "object") all.push(item.url || item.playurl || "");
                });
            else if (typeof backup === "string") all = all.concat(backup.split(/[;,]\s*(?=https?:\/\/)/i));
            var unique = [];
            all.forEach(function (candidate) {
                if (isAllowedPlaybackURL(candidate) && unique.indexOf(candidate) < 0) unique.push(candidate);
            });
            // Prefer the BK host, as the reference does, without searching the query.
            return unique.sort(function (a, b) {
                var scoreA = playbackHost(a).indexOf("bklive-") >= 0 ? 0 : 1;
                var scoreB = playbackHost(b).indexOf("bklive-") >= 0 ? 0 : 1;
                return scoreA - scoreB || (a < b ? -1 : a > b ? 1 : 0);
            });
        }
        function log(message) {
            if (typeof native !== "undefined" && typeof native.log === "function") native.log(message);
        }
        function publicChannel(channel) {
            return {
                id: channel.id,
                name: channel.name,
                group: channel.group,
                tvgID: channel.tvgID,
                logo: channel.logo,
                definition: channel.definition,
                quality: channel.quality,
                note: channel.note,
            };
        }
        // ---- BK 解析主流程：请求 → 校验 iretcode → 收集候选地址；失败返回 ok:false 而不抛错 ----
        function resolveChannel(channel) {
            log("BK resolve start: " + channel.id + " (" + channel.definition + ")");
            var result = Promise.resolve()
                .then(function () {
                    return http(upstreamRequest(channel));
                })
                .then(function (response) {
                    if (response.status < 200 || response.status > 299) throw new Error("源站 HTTP " + response.status);
                    var payload;
                    try {
                        payload = JSON.parse(response.body);
                    } catch (_) {
                        throw new Error("源站未返回有效 JSON");
                    }
                    if (!payload || typeof payload !== "object" || Array.isArray(payload))
                        throw new Error("源站响应结构不正确");
                    if (
                        (typeof payload.iretcode !== "number" && typeof payload.iretcode !== "string") ||
                        Number(payload.iretcode) !== 0 ||
                        payload.iretcode === ""
                    ) {
                        var code = String(payload.iretcode === undefined ? "missing" : payload.iretcode)
                            .replace(/[^a-zA-Z0-9_-]/g, "")
                            .slice(0, 24);
                        throw new Error("源站拒绝解析（iretcode=" + code + "）");
                    }
                    var candidates = collectCandidates(payload);
                    if (!candidates.length) throw new Error("源站没有返回可接受的 HTTP(S) 播放 URL");
                    const at = new Date().toISOString();
                    log(
                        "BK resolve success: " +
                        channel.id +
                        "; candidates=" +
                        candidates.length +
                        "; host=" +
                        playbackHost(candidates[0]),
                    );
                    return {
                        ok: true,
                        channel: publicChannel(channel),
                        url: candidates[0],
                        candidates: candidates,
                        headers: PLAYBACK_HEADERS,
                        source: "BK live",
                        quality: channel.quality,
                        resolvedAt: at,
                    };
                })
                .catch(function (error) {
                    const at = new Date().toISOString();
                    var diagnostic = sanitizedDiagnostic(error.message);
                    log("BK resolve failed: " + channel.id + "; " + diagnostic);
                    return {
                        ok: false,
                        channel: publicChannel(channel),
                        url: null,
                        candidates: [],
                        headers: {},
                        source: "BK live",
                        quality: channel.quality,
                        resolvedAt: at,
                        error: diagnostic,
                    };
                });
            return result;
        }

        // ---- 导出给服务入口 ----
        return {
            resolve: resolveChannel, // 频道对象 → { ok, url, candidates, headers, ... }；失败返回 ok:false
            // 仅供测试：纯函数，不访问网络、时间或随机数。
            testing: {
                teaBlockHex: function (block, key) {
                    return toHex(teaBlock(fromHex(block), fromHex(key)));
                },
                checksumHex: function (hex) {
                    return checksum(fromHex(hex));
                },
                createCKeyVector: function (channelID, timestamp, initialByte) {
                    var next = initialByte;
                    return createCKey(channelID, timestamp, function (count) {
                        var bytes = [];
                        for (var i = 0; i < count; i++) bytes.push(next++ & 255);
                        return bytes;
                    });
                },
                isAllowedPlaybackURL: isAllowedPlaybackURL,
                collectCandidates: collectCandidates,
            },
        };
    }

    /*
     * ③ Device 协议 createDeviceProtocol() —— 脚本内部模块，只由服务入口调用，宿主不直接调用。
     *
     * 模拟「央视频电视投屏助手」设备，取高码率直播地址（含 4K / 8K 频道）：
     *   start()   载入或创建设备身份（host.storage 的 identity），注册 30 秒心跳
     *   ensure()  按需建立设备会话：app/start 取会话密钥 → cloud/get 或 cloud/register 取 guid → 心跳确认；
     *             会话 2 小时内复用，失败后冷却 30 秒
     *   resolve() live/01 取视频列表 → live/02 取 appSecret → VDN 签名换最终地址
     *   mediaActivity() 播放器仍在播时刷新链接活跃时间，让心跳继续
     * 只有 LIVE_IDS 里的频道能走这条路。业务字段只放在脚本里，不进 Swift。
     */
    function createDeviceProtocol() {
        // ---- 协议常量、频道 Live ID、默认设备模板 ----
        const AK = "9f5c54c4ed0e50109b800f7e28fec205";
        const PUBLIC_KEY =
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkKeLy4ywWLSnBkwRyqYgF3HMIj05V5uuh5HjyEsZOWnu1NHu3jPQv3sr32wwQNYv5qapsNXmNgLUDHtgHZxqPQAYXltjSRc0qhcD286t62wOIHId8zXS3s1Jy4rgU4qjQWzI9rp/1sE0pMsmwTaJa4zuJ5iz8VwF8Av5oJ1k+HxY+/HLnjNlW1hmWLpuDYmkZYuAoTHa1VGeHQh9FEKI8ZcL3GTQphShUoC+Kg3P1hGUVTtCYapmzPS5lkAdwebuzwvTCfGiTErYZCnPBUSeV7BVlgjtLYIi29KvF0a8FHsJMfe/UdHcyW/RihsIYOtDQcRRpFGXyPXbVrzFJse24QIDAQAB";
        const LIVE_IDS = {
            "cctv1": "Live1717729995180256",
            "cctv2": "Live1718261577870260",
            "cctv3": "Live1718261955077261",
            "cctv4": "Live1718276148119264",
            "cctv5": "Live1719474204987287",
            "cctv5p": "Live1719473996025286",
            "cctv7": "Live1718276412224269",
            "cctv8": "Live1718276458899270",
            "cctv9": "Live1718276503187272",
            "cctv10": "Live1718276550002273",
            "cctv11": "Live1718276603690275",
            "cctv12": "Live1718276623932276",
            "cctv13": "Live1718276575708274",
            "cctv14": "Live1718276498748271",
            "cctv15": "Live1718276319614267",
            "cctv16": "Live1718276256572265",
            "cctv17": "Live1718276138318263",
            "cctv4k": "Live1767871224782105",
            "cctv8k": "Live1688400593818102",
            "cctv164k": "Live1704966749996185",
            "cgtn": "Live1719392219423280",
            "cgtnfr": "Live1719392670442283",
            "cgtnru": "Live1719392779653284",
            "cgtnar": "Live1719392885692285",
            "cgtnes": "Live1719392560433282",
            "cgtndoc": "Live1719392360336281",
        };
        const DEFAULT_TEMPLATE = {
            "source": "sony_8k_pool.XR-85Z9K",
            "brand": "Sony",
            "manufacturer": "Sony",
            "model": "XR-85Z9K",
            "report_model": "XR85Z9K",
            "hardware": "mt5895",
            "board": "mt5895",
            "version_id": "SONYTV.2022.XR_85Z9K",
            "screen_param": "7680-4320-280",
            "cast_model": "XR-85Z9K",
        };
        const BASE = "https://ytpaddr.cctv.cn/gsnw/";
        // 运行期状态：identity 设备身份；session 当前会话；links / mediaLinks 正在使用的频道（限 6 个）。
        let host,
            identity,
            session = null,
            initializing = null,
            transactions = Promise.resolve(),
            lastControl = 0,
            lastAccess = 0,
            blockedUntil = 0,
            lastFailure = null,
            cloudWarning = null;
        const responses = new WeakMap();
        const links = new Map(),
            mediaLinks = new Map();
        function fail(stage, message, code, status) {
            const e = new Error(message);
            e.stage = stage;
            e.code = code;
            if (status) e.status = status;
            return e;
        }
        // ---- 设备身份与签名：UID、指纹、请求头 ----
        function stable(value, slash = false) {
            function sort(v) {
                if (Array.isArray(v)) return v.map(sort);
                if (v && typeof v === "object") {
                    const o = {};
                    Object.keys(v)
                        .sort()
                        .forEach((k) => (o[k] = sort(v[k])));
                    return o;
                }
                return v;
            }
            const text = JSON.stringify(sort(value));
            return slash ? text.replace(/\//g, "\\/") : text;
        }
        function hashcode(value) {
            let h = 0;
            for (const c of value) h = (Math.imul(h, 31) + c.codePointAt(0)) | 0;
            return h;
        }
        function signedHex32(value) {
            return (value < 0 ? "ffffffff" : "00000000") + (value >>> 0).toString(16).padStart(8, "0");
        }
        function uid(p, h) {
            const b =
                "1698" +
                [
                    "hardware",
                    "board",
                    "brand",
                    "device",
                    "manufacturer",
                    "model",
                    "product",
                    "tags",
                    "build_type",
                    "user",
                    "resolution",
                    "mac",
                ]
                    .map((k) => p[k])
                    .join("");
            return h.crypto
                .digest("sha1", p.android_id + "|" + signedHex32(hashcode(b)) + signedHex32(hashcode(p.model)))
                .toUpperCase();
        }
        function fingerprint(x, ms, h) {
            const day = Math.floor((Math.floor(ms / 1000) + 28800) / 86400) * 86400000 - 28800000;
            return h.crypto.digest("sha256", h.crypto.digest("sha256", AK + x + ms + day));
        }
        function uuid() {
            const a = host.randomHex(16).split("");
            a[12] = "4";
            a[16] = ((parseInt(a[16], 16) & 3) | 8).toString(16);
            const s = a.join("");
            return s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20);
        }
        function createIdentity(h) {
            const t = DEFAULT_TEMPLATE,
                id = (t.brand + "_" + t.model)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/_$/, "");
            const mac = h.randomHex(6).match(/../g);
            mac[0] = ((parseInt(mac[0], 16) | 2) & 254).toString(16).padStart(2, "0");
            const p = {
                android_id: h.randomHex(8),
                mac: mac.join(":"),
                hardware: t.hardware,
                board: t.board,
                brand: t.brand,
                device: id,
                manufacturer: t.manufacturer,
                model: t.model,
                product: id,
                tags: "release-keys",
                build_type: "user",
                user: "build",
                resolution: t.screen_param.split("-").slice(0, 2).join("*"),
                display: t.model + "-user 13 " + t.version_id + " 2024 release-keys",
                version_id: t.version_id,
                host: t.brand.toLowerCase() + "-tv-build",
                fingerprint: t.manufacturer + "/" + id + "/" + id + ":13/" + t.version_id + "/2024:user/release-keys",
                report_model: t.report_model,
            };
            return {
                schema_version: 1,
                profile: p,
                profile_source: t.source,
                screen_param: t.screen_param,
                cast_model: t.cast_model,
                cloud_guid: "",
                registered_at: 0,
            };
        }
        function keyBytes(key, h) {
            let hex = h.bytes.convert(key, "utf8", "hex");
            return h.bytes.convert((hex + "00".repeat(32)).slice(0, 64), "hex", "base64");
        }
        function decrypt(value, key, h = host) {
            try {
                return h.bytes.convert(h.crypto.open({ key: keyBytes(key, h), data: value }), "base64", "utf8");
            } catch (_) {
                throw fail("decrypt", "AES-GCM authentication or encoding failed");
            }
        }
        function encrypt(value, key) {
            return host.crypto.seal({ key: keyBytes(key, host), data: host.bytes.convert(value, "utf8", "base64") });
        }
        function headers(context, content = "application/json", time) {
            return {
                "Accept": "application/json",
                "Accept-Language": "zh-CN,zh;q=0.8",
                "Referer": "api.cctv.cn",
                "User-Agent": "cctv_app_tv",
                "UID": context.profile.android_id,
                appChannel: "dangbei",
                "X-Uid": context.x_uid,
                "X-Fingerprint": context.x_fingerprint,
                "X-Version": "1.4.1",
                "X-Timestamp": String(time || host.now()),
                "X-Nonce": uuid(),
                "Content-Type": content,
                "Cache-Control": "no-cache",
            };
        }
        function common(context, sdk = "") {
            const p = context.profile;
            const v = {
                cctv_id: context.x_uid,
                device_id: p.android_id,
                idfa: "",
                idfv: "",
                user_id: "",
                app_key: "1178c84d-4818-44ff-b415-02106e87e144",
                imei: "",
                android_id: p.android_id,
                mac: p.mac,
                device_builder_type: p.build_type,
                device_hardware: p.hardware,
                device_board: p.board,
                device_brand: p.brand,
                device_params: p.device,
                device_display: p.display,
                device_version_id: p.version_id,
                device_host: p.host,
                device_product: p.product,
                device_tags: p.tags,
                device_user: p.user,
                device_fingerprint: p.fingerprint,
                device_manufacturer: p.manufacturer,
                device_model: p.report_model || p.model.replace(p.manufacturer, "").replace(/ /g, ""),
                device_resolution: p.resolution,
                system_type: "Android",
                device_type: "TV",
                app_language: "CHINESE",
                app_version: "1.4.1",
                sdk_version: sdk,
                os_version: (p.fingerprint.split(":")[1] || "").split("/")[0],
                app_channel: "dangbei",
                data_time: String(host.now()),
            };
            const limits = {
                device_host: 128,
                device_user: 30,
                device_fingerprint: 128,
                device_model: 50,
                device_resolution: 20,
                app_version: 30,
                sdk_version: 30,
                os_version: 20,
                app_channel: 50,
                data_time: 13,
            };
            Object.keys(v).forEach((k) => (v[k] = String(v[k]).slice(0, limits[k] || 64)));
            return v;
        }
        // ---- 请求通道：所有设备协议请求串行执行 ----
        // Own the whole protocol transaction, not just individual HTTP operations.
        function transaction(task) {
            const pending = transactions.then(task, task);
            transactions = pending.catch(() => { });
            return pending;
        }
        async function post(
            stage,
            url,
            body,
            extra = {},
            form = false,
            slash = false,
            cloudResponse = false,
            context = identity,
        ) {
            const wait = 2000 - (host.now() - lastControl);
            if (lastControl && wait > 0) await host.scheduler.sleep(wait);
            // app/start must create its fingerprint and timestamp after the pacing wait.
            const payload = typeof body === "function" ? body() : body;
            const additional = typeof extra === "function" ? extra() : extra;
            let response;
            try {
                response = await host.http.request({
                    url,
                    method: "POST",
                    headers: Object.assign(
                        headers(context, form ? "application/x-www-form-urlencoded" : "application/json"),
                        additional,
                    ),
                    body: form ? payload : stable(payload, slash),
                    timeoutSeconds: 15,
                });
            } catch (_) {
                throw fail(stage, stage + " network transport failed");
            } finally {
                lastControl = host.now();
            }
            let value;
            try {
                value = JSON.parse(response.body);
            } catch (_) { }
            const business = resultCode(value);
            if (value && typeof value === "object")
                responses.set(value, { httpStatus: response.status, businessCode: business });
            if (cloudResponse)
                host.log(
                    "DEVICE control stage=" +
                    stage +
                    " HTTP=" +
                    response.status +
                    " business=" +
                    (business ?? "none") +
                    " guidPresent=" +
                    !!guid(value),
                );
            // Python uses cloud result codes even when the endpoint returns HTTP 400.
            // Other endpoints and unknown HTTP errors must never use this exception.
            const registration = cloudResponse && response.status === 400 && [0, 2, 601, 694, 695].includes(business);
            if ((response.status < 200 || response.status >= 300) && !registration) {
                const e = fail(
                    stage,
                    stage + " HTTP " + response.status + (business !== null ? " (business " + business + ")" : ""),
                    response.status,
                );
                e.httpStatus = response.status;
                e.businessCode = business;
                e.responseType = value && typeof value === "object" ? "json" : "non-json";
                throw e;
            }
            if (!value || typeof value !== "object") throw fail(stage, stage + " returned invalid JSON");
            return value;
        }
        function resultCode(v) {
            if (!v || typeof v !== "object") return null;
            for (const k of ["result", "code", "errCode", "errcode", "ret"]) {
                const n = v[k];
                if (typeof n === "number" && Number.isInteger(n)) return n;
                if (typeof n === "string" && /^-?\d+$/.test(n)) return Number(n);
            }
            for (const k of ["data", "error", "response"]) {
                const n = resultCode(v[k]);
                if (n !== null) return n;
            }
            return null;
        }
        function cloudGateway(e) {
            return (
                ["cloud/get", "cloud/register"].includes(e.stage) &&
                [502, 503, 504].includes(e.httpStatus) &&
                e.businessCode == null
            );
        }
        function guid(v) {
            return v && v.data && typeof v.data.guid === "string" ? v.data.guid : "";
        }
        // ---- 会话建立与心跳 ----
        async function heartbeatCurrent() {
            const s = session;
            if (!s || host.now() - lastAccess > 120000) return;
            const v = await post(
                "heartbeat",
                "https://ytpdata.cctv.cn/das/app/data/message/single",
                () => ({
                    key: "app_heartbeat",
                    value: Object.assign(common(s.identity), { network_type: "WiFi", guid: s.guid, other: "" }),
                }),
                {},
                false,
                false,
                false,
                s.identity,
            );
            const code = resultCode(v);
            if (code !== null && code !== 0) {
                session = null;
                const e = fail("heartbeat", "Heartbeat rejected", code);
                Object.assign(e, responses.get(v) || {}, { responseType: "json" });
                throw e;
            }
        }
        function heartbeat() {
            return transaction(heartbeatCurrent);
        }
        async function bootstrap() {
            const context = JSON.parse(JSON.stringify(identity)),
                savedUID = identity.x_uid;
            let time;
            context.x_uid = uid(context.profile, host);
            const app = await post(
                "app/start",
                BASE + "api/app/start/v1/01",
                () => {
                    time = host.now();
                    context.x_fingerprint = fingerprint(context.x_uid, time, host);
                    return { key: "app_start_d1", value: common(context) };
                },
                () => ({ UID: "", "X-Timestamp": String(time) }),
                false,
                true,
                false,
                context,
            );
            const encrypted = typeof app.data === "string" ? app.data : app.data && app.data.key;
            if (typeof encrypted !== "string") throw fail("app/start", "Missing encrypted session key", resultCode(app));
            const key = decrypt(encrypted, context.x_fingerprint.slice(0, 32));
            const savedGUID =
                savedUID === context.x_uid && typeof context.cloud_guid === "string" && context.cloud_guid.trim()
                    ? context.cloud_guid
                    : "";
            cloudWarning = null;
            const body = {
                device_name: "央视频电视投屏助手",
                device_id: host.crypto.rsaEncrypt({
                    publicKey: PUBLIC_KEY,
                    data: host.bytes.convert(context.x_uid, "utf8", "base64"),
                }),
            };
            let retries = 0;
            const get = async () => {
                for (; ;) {
                    try {
                        return await post(
                            "cloud/get",
                            "https://ytpcloudws.cctv.cn/cloudps/wssapi/device/v2/get",
                            body,
                            {},
                            false,
                            false,
                            true,
                            context,
                        );
                    } catch (e) {
                        // Reads may retry once only when no saved identity can recover the session.
                        if (!savedGUID && cloudGateway(e) && retries < 1) {
                            retries++;
                            host.log("DEVICE cloud/get gateway retry=1/1 HTTP=" + e.httpStatus);
                            continue;
                        }
                        throw e;
                    }
                }
            };
            let value,
                cloud = "",
                code = null;
            try {
                value = await get();
                cloud = guid(value);
                code = resultCode(value);
                if (!cloud && [601, 2].includes(code)) {
                    for (let i = 0; i < 2; i++) {
                        value = await post(
                            "cloud/register",
                            "https://ytpcloudws.cctv.cn/cloudps/wssapi/device/v2/register",
                            body,
                            {},
                            false,
                            false,
                            true,
                            context,
                        );
                        cloud = guid(value);
                        code = resultCode(value);
                        if (cloud || code !== 695) break;
                    }
                    if (!cloud && [0, 694, 2].includes(code)) {
                        value = await get();
                        cloud = guid(value);
                        code = resultCode(value);
                    }
                }
            } catch (e) {
                if (!savedGUID || !cloudGateway(e)) throw e;
                cloudWarning = {
                    stage: e.stage,
                    httpStatus: e.httpStatus,
                    businessCode: null,
                    recovery: "persisted-guid",
                    at: host.now() / 1000,
                };
                host.log(
                    "DEVICE cloud unavailable stage=" + e.stage + " HTTP=" + e.httpStatus + " recovery=persisted-guid",
                );
            }
            let guidSource = "cloud";
            if (!cloud && savedGUID && ([0, 2, 601, 694, 695].includes(code) || cloudWarning)) {
                cloud = savedGUID;
                guidSource = "persisted";
                host.log(
                    "DEVICE restore guidSource=persisted " +
                    (cloudWarning ? "afterHTTP=" + cloudWarning.httpStatus : "afterBusiness=" + code),
                );
            }
            if (!cloud) {
                const e = fail("cloud/register", "Device registration returned no guid", resultCode(value));
                Object.assign(e, responses.get(value) || {}, { responseType: "json" });
                throw e;
            }
            session = { key, guid: cloud, created: host.now(), identity: context, guidSource };
            // A cached guid is only a recovery candidate; heartbeat must still accept it.
            await heartbeatCurrent();
            identity.x_uid = context.x_uid;
            identity.cloud_guid = cloud;
            identity.registered_at = identity.registered_at || Math.floor(host.now() / 1000);
            persist();
            blockedUntil = 0;
            lastFailure = null;
            host.log("DEVICE session ready guidSource=" + guidSource);
            return session;
        }
        function rememberFailure(e) {
            lastFailure = {
                stage: e.stage || "device",
                code: e.code ?? null,
                httpStatus: e.httpStatus ?? null,
                businessCode: e.businessCode ?? null,
                responseType: e.responseType || null,
                at: host.now() / 1000,
                retryAt: blockedUntil / 1000,
            };
        }
        async function ensure() {
            lastAccess = host.now();
            if (initializing) return initializing;
            if (session && host.now() - session.created < 7200000) return session;
            if (host.now() < blockedUntil) {
                const reason = lastFailure
                    ? " after " +
                    lastFailure.stage +
                    (lastFailure.businessCode !== null ? " (business " + lastFailure.businessCode + ")" : "")
                    : "";
                const e = fail("device/cooldown", "Device initialization is cooling down" + reason);
                e.retryAt = blockedUntil / 1000;
                throw e;
            }
            initializing = bootstrap()
                .catch((e) => {
                    session = null;
                    blockedUntil = host.now() + 30000;
                    rememberFailure(e);
                    throw e;
                })
                .finally(() => {
                    initializing = null;
                });
            return initializing;
        }
        function form(value) {
            return Object.keys(value)
                .map(
                    (k) =>
                        encodeURIComponent(k) +
                        "=" +
                        encodeURIComponent(value[k])
                            .replace(/%20/g, "+")
                            .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()),
                )
                .join("&");
        }
        // ---- 直播解析（服务入口调用）----
        function resolve(channel, rate = "36p") {
            return transaction(() => resolveCurrent(channel, rate));
        }
        async function resolveCurrent(channel, rate) {
            if (!LIVE_IDS[channel.id]) throw fail("device/channel", "Device route unavailable for this channel", null, 422);
            lastAccess = host.now();
            for (const [key, time] of links)
                if (
                    lastAccess - time > 15000 &&
                    !Array.from(mediaLinks.values()).some((v) => v.channelID === key && lastAccess - v.at < 120000)
                )
                    links.delete(key);
            if (!links.has(channel.id) && links.size >= 6) throw fail("device/quota", "Device link quota reached");
            const s = await ensure();
            try {
                const one = await post(
                    "live/01",
                    BASE + "api/live/v1/01",
                    {
                        screenParam: s.identity.screen_param,
                        rate: "",
                        systemType: "ios",
                        model: s.identity.cast_model,
                        id: LIVE_IDS[channel.id],
                        userId: "BAEBFF2B-C516-4F34-ABC0-A824A6461CBD",
                        clientSign: "cctvVideo",
                        deviceId: { serial: "", imei: "", android_id: "" },
                    },
                    {},
                    false,
                    false,
                    false,
                    s.identity,
                );
                const videos = one.data && (one.data.videoList || one.data.videos);
                if (!Array.isArray(videos)) throw fail("live/01", "Missing videos", resultCode(one));
                const candidates = videos.filter((v) => v && typeof v.url === "string" && v.url);
                const video = candidates.find((v) => v.rate === rate) || candidates[0];
                if (!video) throw fail("live/01", "No usable video URL");
                const safeRate = (v) => (/^\d+p$/.test(v || "") ? v : "other");
                host.log(
                    "DEVICE live channel=" +
                    channel.id +
                    " selectedRate=" +
                    safeRate(video.rate) +
                    " availableRates=" +
                    candidates.map((v) => safeRate(v.rate)).join(","),
                );
                const raw = /^https?:\/\//.test(video.url) ? video.url : decrypt(video.url, s.key);
                const two = await post(
                    "live/02",
                    BASE + "api/live/v1/02",
                    { guid: encrypt("", s.key) },
                    {},
                    false,
                    false,
                    false,
                    s.identity,
                );
                const secretValue =
                    typeof two.data === "string" ? two.data : two.data && (two.data.appSecret || two.data.app_secret);
                if (typeof secretValue !== "string") throw fail("live/02", "Missing appSecret", resultCode(two));
                const secret = decrypt(secretValue, s.key);
                const random = host.randomHex(4) + "-0000-" + host.randomHex(2) + "-0000-00000000" + host.randomHex(2);
                const sign = host.crypto.digest("md5", AK + secret + random);
                const vdn = await post(
                    "VDN",
                    "https://ytpvdn.cctv.cn/cctvmobileinf/rest/cctv/videoliveUrl/getstream",
                    form({
                        appcommon: stable({ adid: "", av: "1.4.1", an: "央视频电视投屏助手", ap: "cctv_app_tv" }),
                        url: raw,
                    }),
                    { APPID: AK, APPSIGN: sign, APPRANDOMSTR: random },
                    true,
                    false,
                    false,
                    s.identity,
                );
                if (
                    String(vdn.succeed).replace(/"/g, "") !== "1" ||
                    typeof vdn.url !== "string" ||
                    !/^https?:\/\//.test(vdn.url)
                )
                    throw fail("VDN", "VDN returned no final URL", resultCode(vdn));
                links.set(channel.id, host.now());
                return {
                    url: vdn.url,
                    headers: {
                        UID: s.identity.profile.android_id,
                        APPID: AK,
                        APPSIGN: sign,
                        APPRANDOMSTR: random,
                        Referer: "api.cctv.cn",
                        "User-Agent": "cctv_app_tv",
                    },
                    source: "device",
                    rate: video.rate || "",
                    quality: video.rateName || video.rate || "未验证",
                    expiresAt: host.now() / 1000 + 60,
                    candidates: [vdn.url],
                    resolutionVerified: false,
                };
            } catch (e) {
                if (e.stage === "decrypt" || [400, 401, 403].includes(e.code)) {
                    session = null;
                    blockedUntil = host.now() + 5000;
                }
                rememberFailure(e);
                throw e;
            }
        }
        // ---- 生命周期（服务入口转发）----
        function mediaActivity(event) {
            if (event.kind === "closed") {
                mediaLinks.delete(event.sessionID);
                return;
            }
            if (event.kind !== "activity") return;
            const now = host.now();
            for (const [id, value] of mediaLinks) if (now - value.at >= 120000) mediaLinks.delete(id);
            mediaLinks.set(event.sessionID, { channelID: event.channelID, at: now });
            lastAccess = now;
            links.set(event.channelID, now);
        }
        function persist() {
            const value = Object.assign({}, identity);
            delete value.x_fingerprint;
            host.storage.set("identity", value);
        }
        function start(h) {
            host = h;
            identity = h.storage.get("identity");
            if (identity) delete identity.x_fingerprint;
            if (
                !identity ||
                !identity.profile ||
                !/^[a-f0-9]{16}$/i.test(identity.profile.android_id || "") ||
                !identity.profile.mac
            ) {
                identity = createIdentity(h);
                h.storage.set("identity", identity);
            }
            h.scheduler.every("ysp-heartbeat", 30000, heartbeat);
        }
        // ---- 导出给服务入口 ----
        return {
            start,
            resolve,
            mediaActivity,
            liveIDs: LIVE_IDS,
            heartbeat,
            status: () => ({
                sessionActive: !!session,
                linkedChannels: links.size,
                guidSource: session ? session.guidSource : null,
                cooldown: host ? Math.max(0, blockedUntil - host.now()) : 0,
                lastFailure,
                cloudWarning,
            }),
            stop: () => {
                persist();
                session = null;
                links.clear();
                mediaLinks.clear();
            },
            // 仅供测试。
            testing: {
                stable,
                hashcode,
                uid,
                fingerprint,
                keyBytes,
                resultCode,
                createIdentity,
                common,
                publicKey: PUBLIC_KEY,
            },
        };
    }

    /*
     * ④ JCE 协议 createJCEProtocol() —— 脚本内部模块，只由服务入口调用，宿主不直接调用。
     *
     * 用 JCE/QMF 二进制协议向 jacc.ysp.cctv.cn 请求某频道某时间段的播放地址，
     * 服务入口用它做两件事：回看（过去的时间窗）和直播窗口（覆盖到未来 15 分钟）。
     * 请求全局串行，相邻两次间隔约 0.7 秒。这里只处理控制报文，视频数据由宿主（Swift）处理。
     * start() 载入或生成 jce-guid 并保存在 host.storage。
     */
    function createJCEProtocol() {
        let host,
            guid,
            flow = Promise.resolve(),
            lastRequestAt = -Infinity;
        // ---- JCE 编解码：W 写入器、R 读取器 ----
        function be(value, n) {
            const out = [];
            for (let i = n - 1; i >= 0; i--) out.push(Math.floor(value / Math.pow(256, i)) & 255);
            return out;
        }
        function W() {
            this.b = [];
        }
        W.prototype.head = function (type, tag) {
            this.b.push(tag < 15 ? (tag << 4) | type : 240 | type);
            if (tag >= 15) this.b.push(tag);
        };
        W.prototype.number = function (v, tag) {
            if (!Number.isSafeInteger(v)) throw new Error("JCE integer outside safe range");
            if (v === 0) {
                this.head(12, tag);
                return;
            }
            const n =
                v >= -128 && v <= 127 ? 1 : v >= -32768 && v <= 32767 ? 2 : v >= -2147483648 && v <= 2147483647 ? 4 : 8;
            this.head({ 1: 0, 2: 1, 4: 2, 8: 3 }[n], tag);
            this.b.push(...be(v, n));
        };
        function utf8(s) {
            const text = unescape(encodeURIComponent(s));
            return Array.from(text, (c) => c.charCodeAt(0));
        }
        function text(b) {
            return decodeURIComponent(escape(String.fromCharCode(...b)));
        }
        W.prototype.string = function (value, tag) {
            const b = utf8(value);
            this.head(b.length > 255 ? 7 : 6, tag);
            this.b.push(...be(b.length, b.length > 255 ? 4 : 1), ...b);
        };
        W.prototype.bytes = function (b, tag) {
            this.head(13, tag);
            this.head(0, 0);
            this.number(b.length, 0);
            this.b.push(...b);
        };
        W.prototype.struct = function (fn, tag) {
            this.head(10, tag);
            fn(this);
            this.head(11, 0);
        };
        function R(bytes) {
            this.b = bytes;
            this.p = 0;
        }
        R.prototype.get = function (n) {
            if (!Number.isInteger(n) || n < 0 || n > 2097152 || this.p + n > this.b.length)
                throw new Error("Truncated JCE");
            const out = this.b.slice(this.p, this.p + n);
            this.p += n;
            return out;
        };
        R.prototype.num = function (n, signed) {
            const a = this.get(n);
            let v = signed && a[0] & 128 ? -1 : 0;
            for (const c of a) v = v * 256 + c;
            if (!Number.isSafeInteger(v)) throw new Error("JCE integer outside safe range");
            return v;
        };
        R.prototype.head = function () {
            const b = this.num(1, false);
            return [b & 15, b >> 4 === 15 ? this.num(1, false) : b >> 4];
        };
        R.prototype.field = function (depth) {
            const [t] = this.head();
            return this.value(t, depth + 1);
        };
        R.prototype.value = function (t, depth) {
            if (depth > 32) throw new Error("JCE nesting limit");
            if (t <= 3) return this.num([1, 2, 4, 8][t], true);
            if (t === 4 || t === 5) {
                const b = this.get(t === 4 ? 4 : 8);
                const dv = new DataView(new Uint8Array(b).buffer);
                return t === 4 ? dv.getFloat32(0) : dv.getFloat64(0);
            }
            if (t === 6 || t === 7) {
                const b = this.get(this.num(t === 6 ? 1 : 4, false));
                if (b.length > 65536) throw new Error("JCE string limit");
                return text(b);
            }
            if (t === 8 || t === 9) {
                const n = this.field(depth);
                if (!Number.isInteger(n) || n < 0 || n > 4096) throw new Error("JCE collection limit");
                const out = t === 9 ? [] : {};
                for (let i = 0; i < n; i++) {
                    if (t === 9) out.push(this.field(depth));
                    else {
                        const k = this.field(depth);
                        out[k] = this.field(depth);
                    }
                }
                return out;
            }
            if (t === 10) return this.struct(depth + 1);
            if (t === 12) return 0;
            if (t === 13) {
                const [sub] = this.head();
                if (sub !== 0) throw new Error("Invalid JCE byte array");
                return this.get(this.field(depth));
            }
            throw new Error("Unsupported JCE type " + t);
        };
        R.prototype.struct = function (depth = 0) {
            if (depth > 32) throw new Error("JCE nesting limit");
            const out = {};
            while (this.p < this.b.length) {
                const [t, tag] = this.head();
                if (t === 11) return out;
                out[tag] = this.value(t, depth + 1);
            }
            return out;
        };
        // ---- QMF 外层报文：wrap 打包（含 gzip）、unwrap 拆包 ----
        function qua(w, id) {
            w.string("3.2.7.26212", 0);
            w.string("302070", 1);
            [1080, 2400, 3].forEach((v, i) => w.number(v, i + 2));
            w.string("12", 5);
            w.number(1, 6);
            w.number(1, 7);
            w.number(420, 8);
            w.string("10070", 9);
            for (let i = 10; i < 15; i++) w.string("", i);
            w.struct((s) => {
                s.number(0, 0);
                s.number(0, 1);
                s.string("", 2);
            }, 15);
            for (let i = 16; i < 19; i++) w.string("", i);
            w.struct((s) => {
                s.number(0, 0);
                s.head(4, 1);
                s.b.push(0, 0, 0, 0);
                s.head(4, 2);
                s.b.push(0, 0, 0, 0);
                s.head(5, 3);
                s.b.push(0, 0, 0, 0, 0, 0, 0, 0);
            }, 19);
            w.string(id.slice(0, 16), 20);
            w.string("Pixel 6", 21);
            w.number(1, 22);
            for (let i = 23; i < 27; i++) w.number(0, i);
            w.string("", 27);
            w.string("", 28);
            w.string(id, 29);
        }
        function toBase64(bytes, h) {
            return h.bytes.convert(bytes.map((b) => b.toString(16).padStart(2, "0")).join(""), "hex", "base64");
        }
        function fromBase64(value, h) {
            const hex = h.bytes.convert(value, "base64", "hex");
            return hex.match(/../g)?.map((v) => parseInt(v, 16)) || [];
        }
        function wrap(body, id, reqid, h) {
            const w = new W();
            w.struct((s) => {
                s.number(reqid, 0);
                s.number(25312, 1);
                s.struct((v) => qua(v, id), 2);
                s.string("1200013", 3);
                s.string(id, 4);
                s.head(9, 5);
                s.number(0, 0);
                s.struct(() => { }, 6);
                s.head(9, 7);
                s.number(0, 0);
                [8, 9, 10].forEach((t) => s.number(0, t));
            }, 0);
            w.bytes(body, 1);
            const inner = [38, ...be(w.b.length + 17, 4), 1, ...Array(10).fill(0), ...w.b, 40];
            const compressed = fromBase64(h.crypto.gzip(toBase64(inner, h)), h);
            // prettier-ignore
            const out = [
                19, 0, 0, 0, 0, ...be(2, 2), ...be(65281, 2), ...be(25312, 2), 0, 0, ...be(reqid, 8), ...be(531, 4),
                ...be(10012, 4), ...Array(8).fill(0), ...utf8(id), 1, ...be(302070, 4), ...Array(6).fill(0), 0, 0,
                0, 0, 0, ...be(inner.length, 4), ...compressed, 3,
            ];
            out.splice(1, 4, ...be(out.length, 4));
            return out;
        }
        function unwrap(bytes, h) {
            if (bytes.length < 90 || bytes[0] !== 19 || bytes[bytes.length - 1] !== 3)
                throw new Error("Invalid QMF response");
            const length = new R(bytes.slice(1, 5)).num(4, false);
            if (length !== bytes.length) throw new Error("QMF length mismatch");
            const flags = new R(bytes.slice(21, 25)).num(4, false);
            let payload = bytes.slice(89, -1);
            if (flags & 2) payload = fromBase64(h.crypto.gunzip(toBase64(payload, h)), h);
            if (payload[0] !== 38 || payload[payload.length - 1] !== 40) throw new Error("Invalid QMF inner payload");
            const root = new R(payload.slice(16, -1)).struct();
            if (!Array.isArray(root[1])) throw new Error("Missing JCE body");
            return new R(root[1]).struct();
        }
        // ---- 请求一次播放地址 ----
        async function request(channel, start, end) {
            const w = new W();
            w.string(channel.livePID, 0);
            w.string(channel.channelID, 1);
            w.number(start, 2);
            w.number(end, 3);
            w.string(channel.definition || "fhd", 4);
            const packet = wrap(w.b, guid, host.now() & 2147483647, host);
            const response = await host.http.request({
                url: "https://jacc.ysp.cctv.cn",
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: toBase64(packet, host),
                bodyEncoding: "base64",
                responseEncoding: "base64",
                timeoutSeconds: 15,
            });
            if (response.status < 200 || response.status >= 300) throw new Error("JCE HTTP " + response.status);
            const value = unwrap(fromBase64(response.body, host), host);
            if (value[0] !== undefined && value[0] !== 0) throw new Error("JCE business code " + value[0]);
            const url = value[2];
            if (typeof url !== "string" || !/^https?:\/\//.test(url)) throw new Error("JCE returned no manifest");
            if (/^https?:\/\/liverecord\.video\.cloud\.cctv\.com(?:[/:]|$)/i.test(url))
                throw new Error("JCE returned an unavailable CDN host");
            return {
                url,
                candidates: [url],
                headers: { "User-Agent": "Mozilla/5.0" },
                source: "JCE",
                quality: channel.definition || "fhd",
                expiresAt: host.now() / 1000 + 60,
                resolutionVerified: false,
            };
        }
        // 服务入口调用：排队串行，控制请求频率。
        function resolve(channel, start, end) {
            const task = flow.then(async () => {
                const wait = 700 + Math.floor(Math.random() * 100) - (host.now() - lastRequestAt);
                if (wait > 0) await host.scheduler.sleep(wait);
                try {
                    return await request(channel, start, end);
                } finally {
                    lastRequestAt = host.now();
                }
            });
            flow = task.then(
                () => undefined,
                () => undefined,
            );
            return task;
        }
        // ---- 导出给服务入口 ----
        return {
            start: (h) => {
                host = h;
                guid = h.storage.get("jce-guid");
                if (typeof guid !== "string" || !/^[0-9a-f]{32}$/.test(guid)) {
                    guid = h.randomHex(16);
                    h.storage.set("jce-guid", guid);
                }
            },
            resolve,
            // 仅供测试。
            testing: { W, R, wrap, unwrap, toBase64, fromBase64 },
        };
    }

    /*
     * ⑤ 频道表 createChannelTable() —— 纯数据，Device / BK / JCE 和服务入口共用。
     *
     * 一个频道走哪个来源，看三处：
     *   - CATCHUP_IDS（本文件）     支持回看与 JCE 直播窗口
     *   - FORCE_BK_IDS（本文件）    auto 模式下固定走 BK
     *   - LIVE_IDS（device.js）     有 Device ID，auto 模式下优先走 Device
     * 选择规则见文件开头导读第三节。
     */
    function createChannelTable() {
        // ---- 频道：id、名称、分组、台标、清晰度；channelID / livePID 是 BK 与 JCE 请求用的上游编号 ----
        // aliases：频道别名 → 正式 id（例如 "zhejiangws" → "zjws"）。
        var METADATA = {
            "channels": [
                {
                    "id": "cctv1",
                    "name": "CCTV-1 综合",
                    "group": "央视",
                    "channelID": "2024078201",
                    "livePID": "600001859",
                    "definition": "fhd",
                    "tvgID": "CCTV1",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv1.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv2",
                    "name": "CCTV-2 财经",
                    "group": "央视",
                    "channelID": "2024075401",
                    "livePID": "600001800",
                    "definition": "fhd",
                    "tvgID": "CCTV2",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv2.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv3",
                    "name": "CCTV-3 综艺",
                    "group": "央视",
                    "channelID": "2024068501",
                    "livePID": "600001801",
                    "definition": "fhd",
                    "tvgID": "CCTV3",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv3.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv4",
                    "name": "CCTV-4 中文国际",
                    "group": "央视",
                    "channelID": "2029797101",
                    "livePID": "600001814",
                    "definition": "fhd",
                    "tvgID": "CCTV4",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv4.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv5",
                    "name": "CCTV-5 体育",
                    "group": "央视",
                    "channelID": "2024078401",
                    "livePID": "600001818",
                    "definition": "fhd",
                    "tvgID": "CCTV5",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv5.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv5p",
                    "name": "CCTV-5+ 体育赛事",
                    "group": "央视",
                    "channelID": "2024078001",
                    "livePID": "600001817",
                    "definition": "fhd",
                    "tvgID": "CCTV5+",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv5p.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv6",
                    "name": "CCTV-6 电影",
                    "group": "央视",
                    "channelID": "2013693901",
                    "livePID": "600108442",
                    "definition": "fhd",
                    "tvgID": "CCTV6",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv6.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv7",
                    "name": "CCTV-7 国防军事",
                    "group": "央视",
                    "channelID": "2024072001",
                    "livePID": "600004092",
                    "definition": "fhd",
                    "tvgID": "CCTV7",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv7.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv8",
                    "name": "CCTV-8 电视剧",
                    "group": "央视",
                    "channelID": "2029793001",
                    "livePID": "600001803",
                    "definition": "fhd",
                    "tvgID": "CCTV8",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv8.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv9",
                    "name": "CCTV-9 纪录",
                    "group": "央视",
                    "channelID": "2024078601",
                    "livePID": "600004078",
                    "definition": "fhd",
                    "tvgID": "CCTV9",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv9.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv10",
                    "name": "CCTV-10 科教",
                    "group": "央视",
                    "channelID": "2024078701",
                    "livePID": "600001805",
                    "definition": "fhd",
                    "tvgID": "CCTV10",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv10.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv11",
                    "name": "CCTV-11 戏曲",
                    "group": "央视",
                    "channelID": "2027248701",
                    "livePID": "600001806",
                    "definition": "fhd",
                    "tvgID": "CCTV11",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv11.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv12",
                    "name": "CCTV-12 社会与法",
                    "group": "央视",
                    "channelID": "2027248801",
                    "livePID": "600001807",
                    "definition": "fhd",
                    "tvgID": "CCTV12",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv12.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv13",
                    "name": "CCTV-13 新闻",
                    "group": "央视",
                    "channelID": "2029797201",
                    "livePID": "600001811",
                    "definition": "fhd",
                    "tvgID": "CCTV13",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv13.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv14",
                    "name": "CCTV-14 少儿",
                    "group": "央视",
                    "channelID": "2027248901",
                    "livePID": "600001809",
                    "definition": "fhd",
                    "tvgID": "CCTV14",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv14.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv15",
                    "name": "CCTV-15 音乐",
                    "group": "央视",
                    "channelID": "2027249001",
                    "livePID": "600001815",
                    "definition": "fhd",
                    "tvgID": "CCTV15",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv15.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv16",
                    "name": "CCTV-16 奥林匹克",
                    "group": "央视",
                    "channelID": "2027249101",
                    "livePID": "600098637",
                    "definition": "fhd",
                    "tvgID": "CCTV16",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv16.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv164k",
                    "name": "CCTV-16 4K",
                    "group": "央视",
                    "channelID": "2027249301",
                    "livePID": "600099502",
                    "definition": "fhd",
                    "tvgID": "CCTV16",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv164k.png",
                    "quality": "1080p候选",
                    "note": "频道名称不代表本原型可提供4K/8K；仅尝试BK live回退链路。",
                },
                {
                    "id": "cctv17",
                    "name": "CCTV-17 农业农村",
                    "group": "央视",
                    "channelID": "2027249401",
                    "livePID": "600001810",
                    "definition": "fhd",
                    "tvgID": "CCTV17",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv17.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctv4k",
                    "name": "CCTV-4K 超高清",
                    "group": "央视",
                    "channelID": "2029810301",
                    "livePID": "600002264",
                    "definition": "fhd",
                    "tvgID": "CCTV4K",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv4k.png",
                    "quality": "1080p候选",
                    "note": "频道名称不代表本原型可提供4K/8K；仅尝试BK live回退链路。",
                },
                {
                    "id": "cctv8k",
                    "name": "CCTV-8K 超高清",
                    "group": "央视",
                    "channelID": "2026774101",
                    "livePID": "600156816",
                    "definition": "fhd",
                    "tvgID": "CCTV-8K",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctv8k.png",
                    "quality": "1080p候选",
                    "note": "频道名称不代表本原型可提供4K/8K；仅尝试BK live回退链路。",
                },
                {
                    "id": "cgtn",
                    "name": "CGTN",
                    "group": "央视",
                    "channelID": "2024181701",
                    "livePID": "600014550",
                    "definition": "fhd",
                    "tvgID": "CGTN英语",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtn.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cgtnfr",
                    "name": "CGTN 法语",
                    "group": "央视",
                    "channelID": "2024181801",
                    "livePID": "600084704",
                    "definition": "fhd",
                    "tvgID": "CGTN法语",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtnfr.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cgtnru",
                    "name": "CGTN 俄语",
                    "group": "央视",
                    "channelID": "2024181901",
                    "livePID": "600084758",
                    "definition": "fhd",
                    "tvgID": "CGTN俄语",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtnru.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cgtnar",
                    "name": "CGTN 阿拉伯语",
                    "group": "央视",
                    "channelID": "2024182001",
                    "livePID": "600084782",
                    "definition": "fhd",
                    "tvgID": "CGTN阿语",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtnar.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cgtnes",
                    "name": "CGTN 西班牙语",
                    "group": "央视",
                    "channelID": "2024182101",
                    "livePID": "600084744",
                    "definition": "fhd",
                    "tvgID": "CGTN西语",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtnes.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cgtndoc",
                    "name": "CGTN 纪录",
                    "group": "央视",
                    "channelID": "2024182301",
                    "livePID": "600084781",
                    "definition": "fhd",
                    "tvgID": "CGTN纪录",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cgtndoc.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cctvfyjc",
                    "name": "CCTV 风云剧场",
                    "group": "央视",
                    "channelID": "2025637102",
                    "livePID": "600099658",
                    "definition": "shd",
                    "tvgID": "CCTV风云剧场",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctvfyjc.png",
                    "quality": "720p候选",
                    "note": "",
                },
                {
                    "id": "cctvdyjc",
                    "name": "CCTV 第一剧场",
                    "group": "央视",
                    "channelID": "2026874202",
                    "livePID": "600099655",
                    "definition": "shd",
                    "tvgID": "CCTV第一剧场",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctvdyjc.png",
                    "quality": "720p候选",
                    "note": "",
                },
                {
                    "id": "cctvhjjc",
                    "name": "CCTV 怀旧剧场",
                    "group": "央视",
                    "channelID": "2026874302",
                    "livePID": "600099620",
                    "definition": "shd",
                    "tvgID": "CCTV怀旧剧场",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cctvhjjc.png",
                    "quality": "720p候选",
                    "note": "",
                },
                {
                    "id": "bjws",
                    "name": "北京卫视",
                    "group": "卫视",
                    "channelID": "2024052703",
                    "livePID": "600002309",
                    "definition": "fhd",
                    "tvgID": "北京卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/bjws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "jsws",
                    "name": "江苏卫视",
                    "group": "卫视",
                    "channelID": "2024171103",
                    "livePID": "600002521",
                    "definition": "fhd",
                    "tvgID": "江苏卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/jsws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "dfws",
                    "name": "东方卫视",
                    "group": "卫视",
                    "channelID": "2024054503",
                    "livePID": "600002483",
                    "definition": "fhd",
                    "tvgID": "东方卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/dfws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "zjws",
                    "name": "浙江卫视",
                    "group": "卫视",
                    "channelID": "2024054703",
                    "livePID": "600002520",
                    "definition": "fhd",
                    "tvgID": "浙江卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/zjws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "hnws",
                    "name": "湖南卫视",
                    "group": "卫视",
                    "channelID": "2024054803",
                    "livePID": "600002475",
                    "definition": "fhd",
                    "tvgID": "湖南卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/hnws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "hbws",
                    "name": "湖北卫视",
                    "group": "卫视",
                    "channelID": "2024171203",
                    "livePID": "600002508",
                    "definition": "fhd",
                    "tvgID": "湖北卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/hbws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "gdws",
                    "name": "广东卫视",
                    "group": "卫视",
                    "channelID": "2024060903",
                    "livePID": "600002485",
                    "definition": "fhd",
                    "tvgID": "广东卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/gdws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "gxws",
                    "name": "广西卫视",
                    "group": "卫视",
                    "channelID": "2024060703",
                    "livePID": "600002509",
                    "definition": "fhd",
                    "tvgID": "广西卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/gxws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "hljws",
                    "name": "黑龙江卫视",
                    "group": "卫视",
                    "channelID": "2029797003",
                    "livePID": "600002498",
                    "definition": "fhd",
                    "tvgID": "黑龙江卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/hljws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "hainanws",
                    "name": "海南卫视",
                    "group": "卫视",
                    "channelID": "2024055603",
                    "livePID": "600002506",
                    "definition": "fhd",
                    "tvgID": "海南卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/hainanws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cqws",
                    "name": "重庆卫视",
                    "group": "卫视",
                    "channelID": "2024061103",
                    "livePID": "600002531",
                    "definition": "fhd",
                    "tvgID": "重庆卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cqws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "szws",
                    "name": "深圳卫视",
                    "group": "卫视",
                    "channelID": "2024061303",
                    "livePID": "600002481",
                    "definition": "fhd",
                    "tvgID": "深圳卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/szws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "scws",
                    "name": "四川卫视",
                    "group": "卫视",
                    "channelID": "2024061403",
                    "livePID": "600002516",
                    "definition": "fhd",
                    "tvgID": "四川卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/scws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "henanws",
                    "name": "河南卫视",
                    "group": "卫视",
                    "channelID": "2029797303",
                    "livePID": "600002525",
                    "definition": "fhd",
                    "tvgID": "河南卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/henanws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "dnws",
                    "name": "东南卫视",
                    "group": "卫视",
                    "channelID": "2024061503",
                    "livePID": "600002484",
                    "definition": "fhd",
                    "tvgID": "东南卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/dnws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "gzws",
                    "name": "贵州卫视",
                    "group": "卫视",
                    "channelID": "2024061603",
                    "livePID": "600002490",
                    "definition": "fhd",
                    "tvgID": "贵州卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/gzws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "jxws",
                    "name": "江西卫视",
                    "group": "卫视",
                    "channelID": "2024061703",
                    "livePID": "600002503",
                    "definition": "fhd",
                    "tvgID": "江西卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/jxws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "lnws",
                    "name": "辽宁卫视",
                    "group": "卫视",
                    "channelID": "2024171303",
                    "livePID": "600002505",
                    "definition": "fhd",
                    "tvgID": "辽宁卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/lnws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "ahws",
                    "name": "安徽卫视",
                    "group": "卫视",
                    "channelID": "2024171403",
                    "livePID": "600002532",
                    "definition": "fhd",
                    "tvgID": "安徽卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/ahws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "hebws",
                    "name": "河北卫视",
                    "group": "卫视",
                    "channelID": "2024171503",
                    "livePID": "600002493",
                    "definition": "fhd",
                    "tvgID": "河北卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/hebws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "sdws",
                    "name": "山东卫视",
                    "group": "卫视",
                    "channelID": "2029787903",
                    "livePID": "600002513",
                    "definition": "fhd",
                    "tvgID": "山东卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/sdws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "tjws",
                    "name": "天津卫视",
                    "group": "卫视",
                    "channelID": "2019927003",
                    "livePID": "600152137",
                    "definition": "fhd",
                    "tvgID": "天津卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/tjws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "jlws",
                    "name": "吉林卫视",
                    "group": "卫视",
                    "channelID": "2025561503",
                    "livePID": "600190405",
                    "definition": "fhd",
                    "tvgID": "吉林卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/jlws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "saxws",
                    "name": "陕西卫视",
                    "group": "卫视",
                    "channelID": "2029795103",
                    "livePID": "600190400",
                    "definition": "fhd",
                    "tvgID": "陕西卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/saxws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "nxws",
                    "name": "宁夏卫视",
                    "group": "卫视",
                    "channelID": "2025608503",
                    "livePID": "600190737",
                    "definition": "fhd",
                    "tvgID": "宁夏卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/nxws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "nmgws",
                    "name": "内蒙古卫视",
                    "group": "卫视",
                    "channelID": "2025561203",
                    "livePID": "600190401",
                    "definition": "fhd",
                    "tvgID": "内蒙古卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/nmgws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "ynws",
                    "name": "云南卫视",
                    "group": "卫视",
                    "channelID": "2025561303",
                    "livePID": "600190402",
                    "definition": "fhd",
                    "tvgID": "云南卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/ynws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "shanxiws",
                    "name": "山西卫视",
                    "group": "卫视",
                    "channelID": "2025560803",
                    "livePID": "600190407",
                    "definition": "fhd",
                    "tvgID": "山西卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/shanxiws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "gsws",
                    "name": "甘肃卫视",
                    "group": "卫视",
                    "channelID": "2025561703",
                    "livePID": "600190408",
                    "definition": "fhd",
                    "tvgID": "甘肃卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/gsws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "qhws",
                    "name": "青海卫视",
                    "group": "卫视",
                    "channelID": "2025559103",
                    "livePID": "600190406",
                    "definition": "fhd",
                    "tvgID": "青海卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/qhws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "xizangws",
                    "name": "西藏卫视",
                    "group": "卫视",
                    "channelID": "2025558003",
                    "livePID": "600190403",
                    "definition": "fhd",
                    "tvgID": "西藏卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/xizangws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "xjws",
                    "name": "新疆卫视",
                    "group": "卫视",
                    "channelID": "2019927403",
                    "livePID": "600152138",
                    "definition": "fhd",
                    "tvgID": "新疆卫视",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/xjws.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "cetv1",
                    "name": "CETV-1",
                    "group": "卫视",
                    "channelID": "2022823801",
                    "livePID": "600171827",
                    "definition": "fhd",
                    "tvgID": "CETV1",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/cetv1.png",
                    "quality": "1080p候选",
                    "note": "",
                },
                {
                    "id": "guoxue",
                    "name": "国学频道",
                    "group": "卫视",
                    "channelID": "2029360403",
                    "livePID": "600213139",
                    "definition": "fhd",
                    "tvgID": "国学",
                    "logo": "https://garysclub.sharewithyou.dpdns.org/logos/ysp-live-logos/guoxue.png",
                    "quality": "1080p候选",
                    "note": "",
                },
            ],
            "aliases": {
                "anhuiws": "ahws",
                "beijingws": "bjws",
                "cctv16hd": "cctv16",
                "cctv5plus": "cctv5p",
                "cctvdiyijuchang": "cctvdyjc",
                "cctvfengyunjuchang": "cctvfyjc",
                "cctvhuaijiujuchang": "cctvhjjc",
                "cgtnalaboyu": "cgtnar",
                "cgtneyu": "cgtnru",
                "cgtnfayu": "cgtnfr",
                "cgtnwaiyujilu": "cgtndoc",
                "cgtnxibanyayu": "cgtnes",
                "chongqingws": "cqws",
                "dongfangws": "dfws",
                "fujiandongnanws": "dnws",
                "guangdongws": "gdws",
                "guangxiws": "gxws",
                "guizhouws": "gzws",
                "hebeiws": "hebws",
                "heilongjiangws": "hljws",
                "hubeiws": "hbws",
                "hunanws": "hnws",
                "jiangsuws": "jsws",
                "jiangxiws": "jxws",
                "jilinws": "jlws",
                "liaoningws": "lnws",
                "neimengguws": "nmgws",
                "ningxiaws": "nxws",
                "qinghaiws": "qhws",
                "shandongws": "sdws",
                "shannxiws": "saxws",
                "shenzhenws": "szws",
                "sichuanws": "scws",
                "tianjinws": "tjws",
                "xinjiangws": "xjws",
                "yunnanws": "ynws",
                "zhejiangws": "zjws",
            },
        };

        // 支持回看的频道；没有 Device 路线时，auto 模式优先走 JCE 直播窗口；channels() 据此标记 catchup。
        // prettier-ignore
        const CATCHUP_IDS = new Set([
            "ahws", "bjws", "cctv1", "cctv10", "cctv13", "cctv2", "cctv3", "cctv4", "cctv5", "cctv5p", "cctv6",
            "cctv7", "cctv8", "cctv8k", "cctv9", "cetv1", "cgtn", "cgtnar", "cgtndoc", "cgtnes", "cgtnfr", "cgtnru",
            "cqws", "dfws", "dnws", "gdws", "gsws", "guoxue", "gxws", "gzws", "hainanws", "hbws", "hebws",
            "henanws", "hljws", "hnws", "jlws", "jsws", "jxws", "lnws", "nmgws", "nxws", "qhws", "saxws", "scws",
            "sdws", "shanxiws", "szws", "tjws", "xizangws", "xjws", "ynws", "zjws",
        ]);
        // 有 Device ID 但 auto 模式下仍固定走 BK 的频道。
        // prettier-ignore
        const FORCE_BK_IDS = new Set([
            "cctv11", "cctv12", "cctv14", "cctv15", "cctv16", "cctv17", "cctvfyjc", "cctvdyjc", "cctvhjjc",
        ]);

        const byID = Object.create(null);
        METADATA.channels.forEach(function (channel) {
            byID[channel.id] = channel;
        });

        return {
            list: METADATA.channels,
            // 频道 id 或别名（不区分大小写）→ 频道对象；找不到返回 null。
            find: function (raw) {
                var key = String(raw || "").toLowerCase();
                key = METADATA.aliases[key] || key;
                return byID[key] || null;
            },
            catchup: CATCHUP_IDS,
            forceBK: FORCE_BK_IDS,
        };
    }

})(globalThis);
