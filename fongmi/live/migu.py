# -*- coding: utf-8 -*-
"""咪咕點播、直播與體育賽事；使用 CatVodSpider 的 net、page、web 與 proxy 接口。"""

import hashlib
import json
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, unquote, urlencode, urlsplit

from base.spider import Spider as BaseSpider


PC_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
APP_UA = "Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7)"
WEB = "https://www.miguvideo.com/"
GW = "https://webapi.miguvideo.com/gateway"
PLAY_HOST = "https://play.miguvideo.com/playurl/v1/play/playurl"
APP_VERSION = "2600037000"
SIGN_TAIL = "3ce941cc3cbc40528bfd1c64f9fdf6c0migu0123"
DD_KEYS = "cdabyzwxkl"
NO_APPCODE = {"641886683", "641886773"}
HLS_MIME = "application/x-mpegURL"
LIVE_INDEX = "e7716fea6aa1483c80cfc10b7795fcb8"
LIVE_PAGE = "0cc265af557e4790987c414b4d75d137"
CCTV_PAGE = "8cfc42990f214674a2e2fa149e7afd6d"
CCTV_GROUP = "1ff892f2b5ab4a79be6e25b69d2f5d05"
PAGE_SIZE, SEARCH_SIZE = 24, 20
PUBLIC_TTL, PLAY_TTL = 300000, 15000
CHINA_TZ = timezone(timedelta(hours=8))
WEB_HEADERS = {"User-Agent": PC_UA, "Referer": WEB}
PAGE_OPTIONS = {"headers": WEB_HEADERS, "timeout": 25000, "callTimeout": 30000}
LOGIN_URL = "https://passport.migu.cn/login?" + urlencode({
    "sourceid": "203021", "apptype": "2", "authType": "", "display": "",
    "relayState": "login", "forceAuthn": "true", "isPassive": "false", "callbackURL": WEB,
})
SEARCH_TYPES = {
    "MOVIE", "ALBUM", "TV_PLAY", "VARIETY_SHOW", "MANGA", "DOCUMENTARY",
    "DOCUMENTARY_COLUMN", "JUVENILE", "OTHER", "GKE", "LIVE", "SPORT",
}
CHANNEL_TYPES = SEARCH_TYPES | {"VERTICAL", "VERTICAL_ALBUM"}


class Spider(BaseSpider):
    def getName(self):
        return "咪咕视频"

    def init(self, extend=""):
        if extend is None or extend == "":
            options = {}
        elif isinstance(extend, dict):
            options = extend
        elif isinstance(extend, str):
            text = extend.strip()
            if not text:
                options = {}
            elif text.startswith("{"):
                options = json.loads(text)
            elif "|" in text:
                uid, token = text.split("|", 1)
                options = {"userId": uid, "token": token}
            else:
                raise ValueError("咪咕 ext 請使用 JSON 物件或 userId|token")
        else:
            raise ValueError("咪咕 ext 必須是 JSON 物件或字串")
        if not options:
            options = self._read_config()
        self.config_auth = self._credentials(options)
        self._set_auth(self.config_auth, "配置")

    @staticmethod
    def _read_config():
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migu_config.txt")
        if not os.path.isfile(path):
            return {}
        with open(path, "r", encoding="utf-8-sig") as file:
            return dict(line.strip().split("=", 1) for line in file
                        if line.strip().startswith(("userId=", "token=")))

    @staticmethod
    def _id(value, name="影片 ID"):
        if isinstance(value, bool) or not isinstance(value, (str, int)):
            raise ValueError("咪咕：%s 格式無效" % name)
        text = str(value)
        if not re.fullmatch(r"[0-9]+", text):
            raise ValueError("咪咕：%s 必須是 ASCII 數字" % name)
        return text

    @classmethod
    def _integer(cls, value, name, minimum=0):
        number = int(cls._id(value, name))
        if number < minimum:
            raise ValueError("咪咕：%s 必須至少為 %d" % (name, minimum))
        return number

    @classmethod
    def _page_number(cls, value):
        return cls._integer(1 if value in (None, "") else value, "頁碼", 1)

    @classmethod
    def _credentials(cls, options):
        if not isinstance(options, dict):
            raise ValueError("咪咕：登入設定必須是物件")
        uid = options.get("userId", options.get("user_id", options.get("uid", "")))
        token = options.get("token", options.get("userToken", options.get("user_token", "")))
        if uid is None:
            uid = ""
        if token is None:
            token = ""
        if not isinstance(token, str) or "\r" in token or "\n" in token:
            raise ValueError("咪咕：token 必須是單行字串")
        token = token.strip()
        if isinstance(uid, str):
            uid = uid.strip()
        if uid != "":
            uid = cls._id(uid, "userId")
        if bool(uid) != bool(token):
            raise ValueError("咪咕登入需要同時設定 userId 與 token")
        return uid, token

    def _set_auth(self, auth, source):
        key = hashlib.sha256("|".join(auth).encode()).hexdigest()[:16]
        self.auth_source = source if auth[0] else "未登入"
        return auth, key

    def _web_cookies(self):
        cookies = str(self.net.getCookie(WEB) or "")
        if "\r" in cookies or "\n" in cookies:
            raise ValueError("咪咕：網頁 Cookie 格式無效")
        return dict(item.strip().split("=", 1) for item in cookies.split(";") if "=" in item)

    def _cookie_auth(self):
        values = self._web_cookies()
        legacy = None
        if values.get("UserInfo"):
            parts = unquote(values["UserInfo"]).split("|")
            if len(parts) < 2:
                raise ValueError("咪咕：網頁登入資料不完整，請重新登入")
            legacy = self._credentials({"userId": parts[0], "token": parts[1]})
        if values.get("userInfo"):
            try:
                info = json.loads(unquote(values["userInfo"]))
            except (TypeError, ValueError):
                raise ValueError("咪咕：網頁登入資料格式無效，請重新登入") from None
            auth = self._credentials(info)
            if legacy is not None and legacy != auth:
                raise ValueError("咪咕：網頁登入資料不同步，請重新登入")
            # SDK 的內層 userInfo 可能是 JSON 或加密資料，只採用明確的過期時間。
            inner = info.get("userInfo")
            if isinstance(inner, str):
                try:
                    inner = json.loads(inner)
                except ValueError:
                    inner = None
            if isinstance(inner, dict) and inner.get("expiredOn") is not None:
                expires = self._integer(inner["expiredOn"], "登入有效期")
                if expires <= int(time.time() * 1000):
                    return "", ""
            return auth
        return legacy or ("", "")

    def _sync_auth(self):
        auth = self._cookie_auth()
        return self._set_auth(auth if auth[0] else self.config_auth, "官網" if auth[0] else "配置")

    def action(self, value):
        if value == "login":
            return {"web": {"url": LOGIN_URL, "cookie": [
                {"url": WEB, "keys": [key]} for key in ("userInfo", "UserInfo")
            ]}}
        if value == "clear_login":
            for key in ("userInfo", "UserInfo", "JSESSIONID"):
                self.net.setCookie(WEB, key + "=; Domain=.miguvideo.com; Path=/; Max-Age=0")
            remaining = self._web_cookies()
            if any(remaining.get(key) for key in ("userInfo", "UserInfo")):
                return {"msg": "未能清除網頁登入，請在登入頁退出後再試"}
        if value in ("login_status", "clear_login"):
            self._sync_auth()
            messages = {"官網": "已取得官網登入憑證，授權會在播放時確認",
                        "配置": "正在使用配置帳號，授權會在播放時確認", "未登入": "目前使用匿名模式"}
            return {"msg": messages[self.auth_source]}
        return {"msg": "未知的咪咕操作"}

    @staticmethod
    def _records(value, name):
        if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
            raise ValueError("咪咕%s：列表格式改變" % name)
        return value

    @staticmethod
    def _body(data, operation):
        if not isinstance(data, dict):
            raise ValueError(operation + "：API 回應格式改變")
        if str(data.get("code")) != "200":
            message = str(data.get("message") or data.get("msg") or "請求被拒絕")
            raise ValueError("%s（%s）：%s" % (operation, data.get("code", "未知"), message))
        if not isinstance(data.get("body"), dict):
            raise ValueError(operation + "：缺少資料正文")
        return data["body"]

    @classmethod
    def _check_response(cls, response, operation):
        if not isinstance(response, dict):
            raise ValueError(operation + "：HTTP 回應格式改變")
        if response.get("error"):
            raise RuntimeError(operation + "：網路請求失敗")
        code = cls._integer(response.get("code"), "HTTP 狀態碼")
        if not 200 <= code < 300:
            raise RuntimeError("%s：HTTP %s" % (operation, code))
        if not isinstance(response.get("content"), str):
            raise ValueError(operation + "：HTTP 正文格式改變")
        return response["content"]

    @staticmethod
    def _label(value):
        return str(value or "").replace("$", "＄").replace("#", "＃").strip()

    @staticmethod
    def _picture(item, live=False):
        fields = ("h5pics", "pics") if live else ("pics", "h5pics")
        pics = item.get(fields[0]) or item.get(fields[1]) or {}
        if not isinstance(pics, dict):
            raise ValueError("咪咕：圖片資料格式改變")
        keys = ("lowResolutionH", "lowResolutionV") if live else ("lowResolutionV", "lowResolutionH")
        picture = pics.get(keys[0]) or pics.get(keys[1]) or ""
        if not isinstance(picture, str):
            raise ValueError("咪咕：圖片網址格式改變")
        return picture

    @staticmethod
    def _program_type(item):
        kind = item.get("programTypeV2")
        if kind is not None and not isinstance(kind, str):
            raise ValueError("咪咕：影片類型格式改變")
        return kind

    @classmethod
    def _is_live(cls, item):
        return item.get("videoType") == "LIVE" or cls._program_type(item) == "LIVE"

    def _cards(self, rows, live=False):
        cards = {}
        for item in self._records(rows, "影片"):
            pid = self._id(item.get("pID"))
            name = item.get("name")
            is_live = self._is_live(item)
            if not isinstance(name, str) or not name.strip() or (live and not is_live):
                raise ValueError("咪咕：影片名稱或直播類型格式改變")
            remark = item.get("nowPlaying") if live else item.get("updateEP") or item.get("subTitle")
            if not remark:
                remark = "直播" if live else (str(item["score"]) + "分" if item.get("score") else "")
            ident = "live/" + pid if is_live else pid
            cards.setdefault(ident, {"vod_id": ident, "vod_name": name, "vod_pic": self._picture(item, live),
                                     "vod_remarks": str(remark),
                                     "style": {"type": "list"} if live else {"type": "rect", "ratio": 0.75}})
        return list(cards.values())

    @staticmethod
    def _initial_data(html, name):
        marker = re.search(r"window\." + re.escape(name) + r"\s*=\s*", html)
        if marker is None:
            raise ValueError("咪咕頁面：缺少資料，可能是登入頁或頁面格式改變")
        try:
            return json.JSONDecoder().raw_decode(html[marker.end():])[0]
        except ValueError:
            raise ValueError("咪咕頁面：內嵌 JSON 格式改變") from None

    def _page_data(self, html):
        return (self._initial_data(html, "__INITIAL_PAGES_STATE__"),
                self._initial_data(html, "__INITIAL_GROUPS_STATE__"))

    def _channel_cards(self, groups):
        rows = []
        for group in self._records(groups, "頻道"):
            body = self._body(group, "咪咕頻道")
            for component in self._records(body.get("components", []), "頻道元件"):
                if component.get("data") is None:
                    continue
                for item in self._records(component["data"], "頻道影片"):
                    kind = self._program_type(item)
                    playable = kind in CHANNEL_TYPES or (
                        kind is None and (item.get("pics") or item.get("h5pics")))
                    if item.get("pID") and playable:
                        rows.append(item)
        cards = self._cards(rows)
        if not cards:
            raise ValueError("咪咕頻道：未找到影片，請確認頻道是否仍有效")
        return cards

    @staticmethod
    def _nav_action(row):
        action = row.get("action")
        if (not isinstance(action, dict) or not isinstance(action.get("type"), str)
                or not action["type"] or not isinstance(action.get("params"), dict)):
            raise ValueError("咪咕導航：跳轉資料格式改變")
        params = action["params"]
        extra = params.get("extra", {})
        if not isinstance(extra, dict):
            raise ValueError("咪咕導航：路由資料格式改變")
        if "is_sports" in extra and not isinstance(extra["is_sports"], bool):
            raise ValueError("咪咕導航：體育路由格式改變")
        return action, params

    def _page_groups(self, pages, groups, pid):
        if not isinstance(pages, dict):
            raise ValueError("咪咕頻道：頁面資料格式改變")
        groups = self._records(groups, "頻道")
        loaded = []
        for group in groups:
            ident = self._body(group, "咪咕頻道").get("id")
            if not isinstance(ident, str) or not ident:
                raise ValueError("咪咕頻道：分組 ID 格式改變")
            loaded.append((ident, group))
        if pid not in pages:
            return None
        body = self._body(pages[pid], "咪咕頻道")
        if body.get("id") != pid:
            raise ValueError("咪咕頻道：頁面 ID 不一致")
        layout = self._records(body.get("groups"), "頻道分組")
        expected = set()
        for group in layout:
            ident = group.get("id")
            if not isinstance(ident, str) or not ident:
                raise ValueError("咪咕頻道：分組 ID 格式改變")
            expected.add(ident)
            # 官網可將子群組放在其他來源頁；依所選頁的明確引用判定歸屬。
            for component in self._records(group.get("components", []), "頻道元件"):
                extra = component.get("extraData")
                if not isinstance(extra, dict) or "groupId" not in extra:
                    continue
                ident = extra["groupId"]
                if not isinstance(ident, str) or not ident:
                    raise ValueError("咪咕頻道：子分組 ID 格式改變")
                expected.add(ident)
        owned = [group for ident, group in loaded if ident in expected]
        return owned or None

    def _nav_channels(self, pages):
        if not isinstance(pages, dict):
            raise ValueError("咪咕導航：頁面資料格式改變")
        tabs = []
        for page in pages.values():
            body = self._body(page, "咪咕導航")
            for group in self._records(body.get("groups", []), "導航分組"):
                for component in self._records(group.get("components", []), "導航元件"):
                    if component.get("compStyle") != "NAV_BAR-25":
                        continue
                    extra = component.get("extraData")
                    if not isinstance(extra, dict):
                        raise ValueError("咪咕導航：選單資料格式改變")
                    tabs.extend(self._records(extra.get("tabs"), "導航分類"))
        channels, home = {}, None
        for tab in tabs:
            _, params = self._nav_action(tab)
            sports = params.get("extra", {}).get("is_sports") is True
            url = params.get("url", "")
            if not isinstance(url, str):
                raise ValueError("咪咕導航：入口網址格式改變")
            target = urlsplit(url)
            if not sports and (target.hostname != "www.miguvideo.com"
                               or target.path != "/mgs/website/prd/index.html"):
                continue
            menus = self._records(tab.get("secondBarNames"), "導航子分類")
            for menu in menus[:1] if sports else menus:
                action, params = self._nav_action(menu)
                if action.get("type") != "REFRESH_PAGE":
                    continue
                if not sports and params.get("extra", {}).get("is_sports") is True:
                    continue
                ident, name = params.get("path"), menu.get("secondBarName")
                if (not isinstance(ident, str) or not re.fullmatch(r"[a-fA-F0-9]{32}", ident)
                        or not isinstance(name, str) or not name.strip()):
                    raise ValueError("咪咕導航：分類 ID 或名稱格式改變")
                route = "home" if sports else "channel"
                if ident in channels and channels[ident]["route"] != route:
                    raise ValueError("咪咕導航：分類路由衝突")
                channels.setdefault(ident, {"id": ident, "name": name.strip(), "route": route})
                if not sports and home is None:
                    home = ident
        if home is None:
            raise ValueError("咪咕導航：未找到影視頻道，請確認官網資料格式")
        return list(channels.values()), home

    def _navigation(self):
        def load():
            # 無 ID 入口由官網選擇目前首頁，導航頁、分類與首頁 ID 都從回應取得。
            response = self.net.req(WEB + "p/channel", PAGE_OPTIONS)
            html = self._check_response(response, "咪咕導航")
            pages, groups = self._page_data(html)
            channels, home = self._nav_channels(pages)
            groups = self._page_groups(pages, groups, home)
            if groups is None:
                # 導航第一項與官網預載頁可能不同；明確載入所選首頁，避免掛錯清單。
                response = self.net.req(WEB + "p/channel/" + home, PAGE_OPTIONS)
                html = self._check_response(response, "咪咕首頁")
                pages, groups = self._page_data(html)
                groups = self._page_groups(pages, groups, home)
                if groups is None:
                    raise ValueError("咪咕首頁：未取得導航所指向的頁面內容")
            items = self._channel_cards(groups)
            return {"channels": channels, "home": home, "items": items}
        return self.net.cached("migu:navigation", {"ttl": PUBLIC_TTL, "stale": False}, load)

    def _channel_items(self, channel):
        navigation = self._navigation()
        entry = next((row for row in navigation["channels"] if row["id"] == channel), None)
        if entry is None:
            raise ValueError("咪咕：分類已變更或無效，請重新載入首頁")
        if channel == navigation["home"]:
            return navigation["items"]
        def load():
            response = self.net.req(WEB + "p/" + entry["route"] + "/" + channel, PAGE_OPTIONS)
            html = self._check_response(response, "咪咕頻道")
            pages, groups = self._page_data(html)
            groups = self._page_groups(pages, groups, channel)
            if groups is None:
                raise ValueError("咪咕頻道：未取得所選分類的頁面內容")
            return self._channel_cards(groups)
        return self.net.cached("migu:channel:" + entry["route"] + ":" + channel,
                               {"ttl": PUBLIC_TTL, "stale": False}, load)

    def homeContent(self, filter=False):
        navigation = self._navigation()
        classes = [{"type_id": "account", "type_name": "帳號", "type_flag": "1"},
                   {"type_id": "live", "type_name": "直播"},
                   {"type_id": "sports", "type_name": "體育賽事"}]
        classes.extend({"type_id": row["id"], "type_name": row["name"]}
                       for row in navigation["channels"])
        result = {"class": classes, "list": navigation["items"][:PAGE_SIZE]}
        if filter:
            groups = self._live_catalog()["groups"]
            result["filters"] = {"live": [{"key": "group", "name": "頻道組", "init": LIVE_INDEX,
                "value": [{"n": group["name"], "v": group["id"]} for group in groups]}],
                "sports": self._sports_filters()}
        return result

    def homeVideoContent(self):
        return {"list": self._navigation()["items"][:PAGE_SIZE]}

    def categoryContent(self, tid, pg="1", filter=False, extend=None):
        page = self._page_number(pg)
        if tid == "account":
            items = [{"vod_id": "action/" + key, "vod_name": name, "vod_remarks": remark,
                      "action": key, "style": {"type": "list"}} for key, name, remark in (
                ("login", "開啟官網登入", "使用密碼、短信或掃碼登入"),
                ("login_status", "檢查登入狀態", "查看目前使用的帳號來源"),
                ("clear_login", "清除網頁登入", "返回配置帳號或匿名模式"),
            )]
        elif tid == "sports":
            items = self._sports_items(extend)
        elif tid in ("live", LIVE_PAGE, CCTV_PAGE):
            index = self._live_catalog()
            selected = extend.get("group") if isinstance(extend, dict) else None
            group = selected or (CCTV_GROUP if tid == CCTV_PAGE else LIVE_INDEX)
            if not isinstance(group, str) or group not in {LIVE_INDEX} | {g["id"] for g in index["groups"]}:
                raise ValueError("咪咕直播：無效的頻道組")
            items = index["items"][group]
        else:
            items = self._channel_items(tid)
        return self.page(items, page, PAGE_SIZE)

    def _live_group(self, data):
        body = self._body(data, "咪咕直播")
        groups = {}
        for row in self._records(body.get("liveList"), "直播分組"):
            ident, name = row.get("vomsID"), row.get("name")
            if (not isinstance(ident, str) or not re.fullmatch(r"[a-zA-Z0-9_-]+", ident)
                    or not isinstance(name, str) or not name):
                raise ValueError("咪咕直播：頻道組格式改變")
            groups.setdefault(ident, {"id": ident, "name": name})
        if not groups:
            raise ValueError("咪咕直播：缺少頻道組")
        return {"groups": list(groups.values()), "items": self._cards(body.get("dataList"), live=True)}

    def _live_catalog(self):
        def load():
            seed = self._live_group(self.net.json(GW + "/live/v2/tv-data/" + LIVE_INDEX,
                                                 {"headers": WEB_HEADERS, "timeout": 20000}))
            items = {LIVE_INDEX: seed["items"]}
            remaining = [group["id"] for group in seed["groups"] if group["id"] != LIVE_INDEX]
            if remaining:
                responses = self.net.batch([
                    {"url": GW + "/live/v2/tv-data/" + group,
                     "options": {"headers": WEB_HEADERS, "timeout": 20000}}
                    for group in remaining
                ], 4)
                if not isinstance(responses, list) or len(responses) != len(remaining):
                    raise ValueError("咪咕直播：批次頻道回應不完整")
                for group, response in zip(remaining, responses):
                    data = json.loads(self._check_response(response, "咪咕直播"))
                    items[group] = self._live_group(data)["items"]
            return {"groups": seed["groups"], "items": items}
        return self.net.cached("migu:live:catalog", {"ttl": PUBLIC_TTL, "stale": False}, load)

    def liveContent(self, url=""):
        # 分類、篩選與直播共用目錄；切台時才取得短效播放網址。
        catalog = self._live_catalog()
        result = []
        for group in catalog["groups"]:
            channels = [{"name": item["vod_name"], "ua": APP_UA, "format": HLS_MIME,
                         "urls": [self.getProxyUrl({"migu": "live", "id": item["vod_id"][5:]}) + "$咪咕"]}
                        for item in catalog["items"][group["id"]]]
            if channels:
                result.append({"name": group["name"], "channel": channels})
        return result

    def _sports_data(self, path, operation):
        body = self._body(self.net.json(GW + path, {'headers': WEB_HEADERS, 'timeout': 20000}), operation)
        if body.get('resultCode', 'SUCCESS') != 'SUCCESS':
            raise ValueError(operation + '：站點未返回成功資料')
        # basic-data 的有效回應使用 initialized=false，其他賽事 API 則需完成載入。
        if '/basic-data/' not in path and body.get('initialized') is not True:
            raise ValueError(operation + '：站點資料尚未準備完成')
        return body

    def _sports_menu(self):
        def load():
            body = self._sports_data('/vms-match/v6/match/balltypedata/1/miguvideo', '咪咕賽事選單')
            result = {}
            for group in self._records(body.get('ballTypeDataList'), '運動項目'):
                for row in self._records(group.get('teamList'), '聯賽'):
                    pid = self._id(row.get('competitionId'), '聯賽 ID')
                    result.setdefault(pid, {'id': pid, 'name': str(row.get('competitionName') or ''),
                                            'sport': str(group.get('projectName') or ''),
                                            'sport_id': self._id(group.get('sportItemId'), '運動項目 ID')})
            if not result:
                raise ValueError('咪咕賽事選單：缺少聯賽')
            return list(result.values())
        return self.net.cached('migu:sports:menu', {'ttl': 300000, 'stale': False}, load)

    @staticmethod
    def _sports_date(value):
        if not isinstance(value, str) or not re.fullmatch(r"[0-9]{8}", value):
            raise ValueError("咪咕賽事：日期必須是 YYYYMMDD")
        try:
            return datetime.strptime(value, "%Y%m%d")
        except ValueError:
            raise ValueError("咪咕賽事：日期不是有效的日曆日期") from None

    def _sports_window(self, competition='all', date='0', direction='default'):
        if competition != 'all':
            competition = self._id(competition, '聯賽 ID')
        if direction not in ('default', 'up', 'down'):
            raise ValueError('咪咕賽事：無效的日程方向')
        if direction == 'default':
            if date != '0':
                raise ValueError('咪咕賽事：預設日程不能使用日期錨點')
        else:
            self._sports_date(date)
        def load():
            body = self._sports_data('/vms-match/v6/staticcache/basic/match-list/normal-match-list/'
                                + '/'.join((date, competition, direction, '1', 'miguvideo')), '咪咕賽事')
            days, matches = body.get('days'), body.get('matchList')
            if not isinstance(days, list) or not isinstance(matches, dict):
                raise ValueError('咪咕賽事：日程格式改變')
            fields = ('mgdbId', 'competitionId', 'sportItemId', 'title', 'modifyTitle', 'pkInfoTitle',
                      'startTime', 'matchStartTime', 'endTime', 'matchEndTime', 'matchStatus',
                      'padImg', 'highResolutionH', 'competitionLogo')
            selected = {}
            for day in days:
                self._sports_date(day)
                rows = self._records(matches.get(day, []), '賽事')
                selected[day] = [{key: row[key] for key in fields if key in row} for row in rows]
            return {'days': sorted(set(days)), 'matches': selected}
        return self.net.cached('migu:sports:' + ':'.join((date, competition, direction)),
                               {'ttl': 30000, 'stale': False, 'persist': False}, load)

    def _sports_phase(self, row, now=None):
        now = int(time.time() * 1000) if now is None else now
        start = self._integer(row.get('startTime') or row.get('matchStartTime') or 0, '賽事開播時間')
        end = self._integer(row.get('endTime') or row.get('matchEndTime') or 0, '賽事結束時間')
        if start and now < start:
            return '0'
        if end and now >= end:
            return '2'
        if start:
            return '1'
        status = str(row.get('matchStatus', '0'))
        if status not in ('0', '1', '2'):
            raise ValueError('咪咕賽事：狀態格式改變')
        return status

    def _sports_lines(self, mid, base, phase, now):
        rows = []
        key = {'0': 'preList', '1': 'liveList', '2': 'replayList'}[phase]
        for group_name in ('commentaryList', 'explanationList'):
            group = base.get(group_name, {})
            if not isinstance(group, dict):
                raise ValueError('咪咕賽事：解說或視角格式改變')
            rows.extend(self._records(group.get(key, []), '賽事線路'))
        if phase in ('0', '1'):
            rows = [row for row in rows if self._sports_phase(row, now) == '1']
            rows.sort(key=lambda row: row.get('defaultPlaybill') != '1')
        body = self._sports_data('/vms-match/v5/staticcache/basic/all-view-list/'
                            + mid + '/' + phase + '/miguvideo', '咪咕賽事影片')
        replays = self._records(body.get('replayList', []), '賽事回放')
        clips = self._records(body.get('recommendList', []), '賽事片段')
        return rows, replays, clips

    def _sports_card(self, row, phase=None):
        mid = self._id(row.get('mgdbId'), '賽事 ID')
        phase = self._sports_phase(row) if phase is None else phase
        name = row.get('pkInfoTitle') or row.get('modifyTitle') or row.get('title')
        if not isinstance(name, str) or not name:
            raise ValueError('咪咕賽事：缺少賽事名稱')
        stamp = self._integer(row.get('matchStartTime') or row.get('startTime') or 0, '賽事時間')
        date = datetime.fromtimestamp(stamp / 1000, CHINA_TZ).strftime('%m/%d %H:%M') if stamp else ''
        return {'vod_id': 'match/' + mid, 'vod_name': name,
                'vod_pic': row.get('padImg') or row.get('highResolutionH') or row.get('competitionLogo') or '',
                'vod_remarks': ' '.join(({'0': '即將開始', '1': '直播中', '2': '已結束'}[phase], date)),
                'style': {'type': 'rect', 'ratio': 1.77777778}}

    def _sports_filters(self):
        window = self._sports_window()
        menu = {row['id']: row for row in self._sports_menu()}
        competitions, sports = {}, {}
        for rows in window['matches'].values():
            for row in rows:
                cid = self._id(row.get('competitionId'), '聯賽 ID')
                sid = self._id(row.get('sportItemId'), '運動項目 ID')
                item = menu.get(cid, {})
                competitions.setdefault(cid, {'n': item.get('name') or row.get('competitionName') or cid, 'v': cid})
                sports.setdefault(sid, {'n': item.get('sport') or sid, 'v': sid})
        days = window['days']
        dates = [{'n': '近期', 'v': '0'}]
        if days:
            start, end = (self._sports_date(days[index]) for index in (0, -1))
            date = start - timedelta(days=7)
            while date <= end + timedelta(days=7):
                dates.append({'n': date.strftime('%m/%d'), 'v': date.strftime('%Y%m%d')})
                date += timedelta(days=1)
        return [{'key': 'date', 'name': '日期', 'init': '0', 'value': dates},
                {'key': 'competition', 'name': '聯賽', 'init': 'all',
                 'value': [{'n': '全部', 'v': 'all'}] + list(competitions.values())},
                {'key': 'sport', 'name': '運動項目', 'init': 'all',
                 'value': [{'n': '全部', 'v': 'all'}] + list(sports.values())},
                {'key': 'state', 'name': '狀態', 'init': 'all', 'value': [
                    {'n': '全部', 'v': 'all'}, {'n': '直播中', 'v': '1'},
                    {'n': '即將開始', 'v': '0'}, {'n': '已結束', 'v': '2'}]}]

    def _sports_items(self, extend=None):
        extend = {} if extend is None else extend
        if not isinstance(extend, dict):
            raise ValueError('咪咕賽事：篩選必須是物件')
        selected = {}
        for key, default in (('date', '0'), ('competition', 'all'), ('state', 'all'), ('sport', 'all')):
            value = extend.get(key)
            if value in (None, ''):
                value = default
            if isinstance(value, bool) or not isinstance(value, (str, int)):
                raise ValueError('咪咕賽事：無效的%s篩選' % key)
            selected[key] = str(value)
        date, competition, state, sport = (selected[key] for key in ('date', 'competition', 'state', 'sport'))
        if state not in ('all', '0', '1', '2'):
            raise ValueError('咪咕賽事：無效的狀態篩選')
        target = self._sports_date(date) if date != '0' else None
        if sport != 'all':
            sport = self._id(sport, '運動項目 ID')
        if competition != 'all' or sport != 'all':
            menu = self._sports_menu()
            if competition != 'all' and self._id(competition, '聯賽 ID') not in {row['id'] for row in menu}:
                raise ValueError('咪咕賽事：未知的聯賽，請重新載入篩選')
            if sport != 'all' and sport not in {row['sport_id'] for row in menu}:
                raise ValueError('咪咕賽事：未知的運動項目，請重新載入篩選')
        base = self._sports_window(competition)
        window = base
        if date != '0':
            days = base['days']
            if days and date not in days:
                first, last = (self._sports_date(days[index]) for index in (0, -1))
                if target < first and target >= first - timedelta(days=7):
                    window = self._sports_window(competition, days[0], 'up')
                elif target > last and target <= last + timedelta(days=7):
                    window = self._sports_window(competition, days[-1], 'down')
                else:
                    raise ValueError('咪咕賽事：日期超出目前可查詢範圍，請重新載入篩選')
            rows = window['matches'].get(date, [])
        else:
            rows = [row for day in window['days'] for row in window['matches'].get(day, [])]
        # 同次載入共用時間，避免篩選、排序與卡片跨過開播／結束邊界。
        now = int(time.time() * 1000)
        items = []
        for row in rows:
            phase = self._sports_phase(row, now)
            if (state != 'all' and phase != state) or (sport != 'all' and str(row.get('sportItemId')) != sport):
                continue
            stamp = self._integer(row.get('startTime') or row.get('matchStartTime') or 0, '賽事時間')
            order = {'1': 0, '0': 1, '2': 2}[phase], -stamp if phase == '2' else stamp
            items.append((order, self._sports_card(row, phase)))
        return [card for _, card in sorted(items, key=lambda item: item[0])]

    def _sports_playlist(self, rows, live=False, fallback=''):
        values = {}
        for row in rows:
            pid = self._id(row.get('pID'), '賽事播放 ID')
            name = self._label(row.get('name'))
            subtitle = self._label(row.get('subTitle'))
            if subtitle and subtitle != name:
                name = subtitle + ' ' + name
            if not name and fallback:
                name = fallback + str(len(values) + 1)
            if not name:
                raise ValueError('咪咕賽事：播放線路缺少名稱')
            values.setdefault(pid, name + '$' + ('live/' if live else '') + pid)
        return '#'.join(values.values())

    def _sports_detail(self, mid):
        mid = self._id(mid, '賽事 ID')
        base = self._sports_data('/vms-match/v5/staticcache/basic/basic-data/'
                            + mid + '/miguvideo', '咪咕賽事詳情')
        if str(base.get('mgdbId')) != mid:
            raise ValueError('咪咕賽事詳情：賽事不存在或回應 ID 不一致')
        now = int(time.time() * 1000)
        phase = self._sports_phase(base, now)
        lines, replays, clips = self._sports_lines(mid, base, phase, now)
        if phase == '2':
            replays = lines + replays
            lines = []
        trailers = self._records(base.get('trailers') or [], '賽事預告')
        groups = []
        for name, rows, live in (
            ('賽前直播' if phase == '0' else '賽事直播', lines, True),
            ('賽事回放', replays, False), ('精彩片段', clips, False), ('預告', trailers, False),
        ):
            if rows:
                groups.append((name, self._sports_playlist(rows, live, '預告' if name == '預告' else '')))
        card = self._sports_card(base, phase)
        stamp = self._integer(base.get('matchStartTime') or base.get('startTime') or 0, '賽事時間')
        when = datetime.fromtimestamp(stamp / 1000, CHINA_TZ).strftime('%Y/%m/%d %H:%M') if stamp else ''
        content = str(base.get('description') or '')
        if phase == '0':
            content = '賽事尚未開始；開賽時間 ' + when + '（UTC+8），開播後請重新載入。' + content
        elif not groups:
            content = '站點目前沒有可播放的線路或回放。' + content
        return dict(card, type_name=str(base.get('competitionName') or ''), vod_content=content,
                    vod_play_from='$$$'.join(name for name, _ in groups),
                    vod_play_url='$$$'.join(value for _, value in groups))

    def _detail_page(self, pid, page):
        body = self._body(self.net.json(GW + "/program/v4/cont/content-info/" + pid + "/" + str(page),
                                       {"headers": WEB_HEADERS, "timeout": 20000}), "咪咕詳情")
        if not isinstance(body.get("data"), dict):
            raise ValueError("咪咕詳情：影片不存在或資料格式改變")
        return body["data"]

    def _episodes(self, pid, data):
        pages = self._integer(data.get("totalPage", 1), "分集頁數")
        total = self._integer(data["totalCount"], "分集總數") if "totalCount" in data else None
        rows = list(self._records(data.get("datas", []), "分集"))
        for page in range(2, pages + 1):
            rows.extend(self._records(self._detail_page(pid, page).get("datas"), "分集"))
        episodes = {}
        for row in rows:
            ident = self._id(row.get("pID"), "分集 ID")
            name = re.sub(r"^《[^》]*》", "", self._label(row.get("name"))).replace("：", " ").strip()
            episodes.setdefault(ident, "%s$%s" % (name or "第%d集" % (len(episodes) + 1), ident))
        if total is not None and len(episodes) != total:
            raise ValueError("咪咕分集：集數資料不完整，請重新載入")
        if not episodes:
            playing = data.get("playing") or {}
            if not isinstance(playing, dict):
                raise ValueError("咪咕詳情：播放資料格式改變")
            episodes[pid] = "正片$" + self._id(playing.get("pID") or pid, "播放 ID")
        return "#".join(episodes.values())

    def detailContent(self, ids):
        result = []
        for value in ids if isinstance(ids, (list, tuple)) else [ids]:
            text = str(value or "")
            if text.startswith("match/"):
                result.append(self._sports_detail(text[6:]))
                continue
            live = text.startswith("live/")
            pid = self._id(text[5:] if live else text)
            data = self._detail_page(pid, 1)
            if not isinstance(data.get("name"), str) or not data["name"]:
                raise ValueError("咪咕詳情：缺少影片名稱")
            live = live or self._is_live(data)
            result.append({"vod_id": "live/" + pid if live else pid, "vod_name": data["name"],
                "vod_pic": self._picture(data, live), "vod_year": str(data.get("year") or ""),
                "vod_area": str(data.get("area") or ""), "vod_actor": str(data.get("actor") or ""),
                "vod_director": str(data.get("director") or ""), "vod_content": str(data.get("detail") or ""),
                "vod_remarks": "直播" if live else str(data.get("updateEP") or ""),
                "type_name": "直播" if live else str(data.get("contentStyle") or data.get("programTypeV2") or ""),
                "vod_play_from": "咪咕直播" if live else "咪咕",
                "vod_play_url": "直播$live/" + pid if live else self._episodes(pid, data)})
        return {"list": result}

    def _playurl_raw(self, pid, rate, auth):
        uid, token = auth
        timestamp = str(int(time.time() * 1000))
        first = hashlib.md5((timestamp + pid + APP_VERSION[:8]).encode()).hexdigest()
        params = {"sign": hashlib.md5((first + SIGN_TAIL).encode()).hexdigest(),
                  "rateType": rate, "contId": pid, "timestamp": timestamp, "salt": "1230024",
                  "flvEnable": "false", "super4k": "true", "h265N": "true", "4kvivid": "true",
                  "2Kvivid": "true", "vivid": "2"}
        headers = {"AppVersion": APP_VERSION, "TerminalId": "android", "User-Agent": APP_UA,
                   "X-UP-CLIENT-CHANNEL-ID": "2600037000-99000-200300220100002"}
        if pid not in NO_APPCODE:
            headers["appCode"] = "miguvideo_default_android"
        if uid and rate != 2:
            headers.update({"UserId": uid, "UserToken": token})
        return self._body(self.net.json(PLAY_HOST, {"params": params, "headers": headers, "timeout": 20000}), "咪咕播放")

    def _ddcalcu(self, pudata, pid, rate, user_id):
        # 標清請求不攜帶 UserId，簽名也使用匿名 ID。
        uid = user_id if rate != 2 else ""
        word = "v"
        if 3 < len(uid) <= 8:
            word = "e"
        elif len(uid) > 8:
            word = DD_KEYS[int(uid[7])]
        extras = {1: word, 2: DD_KEYS[int(datetime.now().strftime("%Y")[0])],
                  3: DD_KEYS[int(pid[6])] if len(pid) > 6 else "a", 4: "a"}
        out = []
        for index in range(len(pudata) // 2):
            out.extend((pudata[-1 - index], pudata[index]))
            if index in extras:
                out.append(extras[index])
        return "".join(out)

    def _signed_url(self, url, pid, rate, user_id):
        if not isinstance(url, str) or re.search(r"[\x00-\x20\x7f]", url):
            raise ValueError("咪咕播放：媒體網址格式改變")
        try:
            parsed = urlsplit(url)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                raise ValueError
            # urlsplit 不會自動驗證 port；Location 不接受未編碼空白或控制字元。
            parsed.port
        except ValueError:
            raise ValueError("咪咕播放：媒體網址格式改變") from None
        params = parse_qs(parsed.query, keep_blank_values=True)
        for key in ("puData", "ddCalcu"):
            if key in params and (len(params[key]) != 1 or not params[key][0]):
                raise ValueError("咪咕播放：媒體簽名資料格式改變")
        if "puData" in params and "ddCalcu" not in params:
            query = urlencode({"ddCalcu": self._ddcalcu(params["puData"][0], pid, rate, user_id),
                               "sv": "10004", "ct": "android"})
            # 原始 query 含上游簽名，不重新編碼或調整順序。
            url = parsed._replace(query=parsed.query + "&" + query).geturl()
        return url

    @classmethod
    def _is_trial(cls, info):
        if info.get("urlType") == "trial":
            return True
        for key in ("trySeeDuration", "truncationTime"):
            value = info.get(key)
            if value not in (None, "", 0, "0", -1, "-1") and cls._integer(value, "試看時長") > 0:
                return True
        return False

    def _resolve(self, pid):
        pid = self._id(pid, "播放 ID")
        auth, account_key = self._sync_auth()
        def load():
            trial_media = None
            for rate in (4, 3, 2) if auth[0] else (2,):
                body = self._playurl_raw(pid, rate, auth)
                if body.get("rid") == "TIPS_NEED_MEMBER":
                    continue
                info = body.get("urlInfo")
                if not isinstance(info, dict):
                    raise ValueError("咪咕播放：缺少播放資料")
                if not info.get("url"):
                    continue
                content = body.get("content") or {}
                if not isinstance(content, dict):
                    raise ValueError("咪咕播放：節目資料格式改變")
                api_auth = body.get("auth")
                signed_uid = auth[0]
                if "auth" in body:
                    if not isinstance(api_auth, dict):
                        raise ValueError("咪咕播放：登入狀態格式改變")
                    logined = api_auth.get("logined")
                    if "logined" in api_auth and not isinstance(logined, bool):
                        raise ValueError("咪咕播放：登入狀態格式改變")
                    # API 有時接受請求但以匿名身份返回網址，不能套用會員簽名。
                    if logined is False:
                        signed_uid = ""
                actual_id = self._id(content.get("contId") or pid, "簽名節目 ID")
                trial = self._is_trial(info)
                media = {"url": self._signed_url(info["url"], actual_id, rate, signed_uid),
                        "header": {"User-Agent": APP_UA},
                        "desc": str(info.get("rateDesc") or "") + ("（試看）" if trial else "")}
                if not trial:
                    return media
                if trial_media is None:
                    trial_media = media
            if trial_media is not None:
                return trial_media
            raise ValueError("咪咕播放：沒有可用畫質，請確認登入、會員權限或節目狀態")
        return self.net.cached("migu:play:" + account_key + ":" + pid,
                               {"ttl": PLAY_TTL, "stale": False, "persist": False}, load)

    def playerContent(self, flag, id, vipFlags=None):
        text = str(id or "")
        return dict(self._resolve(text[5:] if text.startswith("live/") else text), parse=0, jx=0, playUrl="")

    def localProxy(self, params):
        headers = {"Cache-Control": "no-store"}
        if not isinstance(params, dict) or params.get("migu") != "live":
            return [404, "text/plain; charset=utf-8", "未知的咪咕代理入口", headers]
        try:
            media = self._resolve(params.get("id"))
        except ValueError as error:
            return [502, "text/plain; charset=utf-8", str(error), headers]
        headers["Location"] = media["url"]
        return [302, HLS_MIME, "", headers]

    def searchContent(self, key, quick=False, pg="1"):
        page = self._page_number(pg)
        key = str(key or "").strip()
        empty = {"list": [], "page": page, "pagecount": 1, "limit": SEARCH_SIZE, "total": 0}
        if not key:
            return empty
        def load_pack():
            body = self._body(self.net.json(GW + "/common/v1/settings/SEARCH_PACK_ID",
                                           {"headers": WEB_HEADERS}), "咪咕搜尋設定")
            if not isinstance(body.get("paramValue"), str) or not body["paramValue"]:
                raise ValueError("咪咕搜尋：產品包設定格式改變")
            return body["paramValue"]
        pack = self.net.cached("migu:search:pack", {"ttl": 3600000, "stale": False}, load_pack)
        params = {"appVersion": "6.1.1.00", "ct": 101, "isCorrectWord": 1, "k": key,
                  "mediaSource": 9000000, "packId": pack, "pageIdx": page, "pageSize": SEARCH_SIZE,
                  "sid": uuid.uuid4().hex, "copyrightTerminal": 3, "searchScene": 2, "uiVersion": "A3.26.0"}
        body = self._body(self.net.json("https://jadeite.migu.cn/search/v3/open-search", {
            "method": "POST", "postType": "json", "data": params,
            "headers": dict(WEB_HEADERS, Origin=WEB.rstrip("/")), "timeout": 20000}), "咪咕搜尋")
        if str(body.get("responseCode")) != "0000000":
            raise ValueError("咪咕搜尋：搜尋服務拒絕請求")
        if str(body.get("isRecommend", 0)) == "1":
            return empty
        total = self._integer(body.get("totalCount"), "搜尋總數")
        pages = self._integer(body.get("totalPage"), "搜尋頁數")
        rows = self._records(body.get("contentInfoList", [] if total == 0 else None), "搜尋")
        if (total and not pages) or (not total and rows):
            raise ValueError("咪咕搜尋：分頁資料不一致")
        items = []
        for row in rows:
            if str(row.get("contentType")) != "1":
                continue
            item = row.get("shortMediaAsset")
            if not isinstance(item, dict):
                raise ValueError("咪咕搜尋：影片資料格式改變")
            if self._program_type(item) in SEARCH_TYPES:
                items.append(item)
        # totalCount 包含非影片項目，過濾後不回傳假的精確影片總數。
        return {"list": self._cards(items), "page": page, "pagecount": max(1, pages), "limit": SEARCH_SIZE}

    def destroy(self):
        self.config_auth = ("", "")
        self.auth_source = "未登入"
