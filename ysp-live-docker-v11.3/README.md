# 📺 央视频全频道直播 v11.3 旗舰版

## 📢 Gary’s Club 首发渠道

Gary’s Club 社区\
<https://t.me/garysclub>

Gary’s Club Channel 频道\
<https://t.me/garysclubchannel>

请认准以上两个首发渠道，其他转载均非作者发布。

## ✨ 频道与画质

共收录 64 个直播频道，其中 53 个设有节目回看入口，26 个优先使用已注册设备的高码率线路，部分频道支持真 4K。

## 🛠 v11.3 更新

1. 连续播放更稳定。修复 CCTV-16 4K 等频道因重复取源而意外降档的问题。只要直播清单持续更新，就会沿用当前播放地址。
2. 切回频道优先复用原地址。同一设备会话中，5 分钟内切回频道，会优先用原地址读取最新直播清单。
3. 修复取源失败被重复计数的问题。高码率取源首次失败时，先尝试备用线路。15 秒后，下一次播放请求即可重试高码率。

## 💻 电脑版下载

1. 下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v11.3.zip>
2. 解压后，在脚本目录中使用 Python 3.10 或更高版本启动。
3. Windows 运行\
   `python ysp-live-v11.3.py`
4. macOS / Linux 运行\
   `python3 ysp-live-v11.3.py`

## 🐳 Docker 版下载

1. 下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-docker-v11.3.zip>
2. 解压后，在目录中运行\
   `docker compose up -d --build`

## 📱 播放器脚本

1. APTV / mytv-android\
   下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v11.3.py>
2. nanoTV\
   下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-service_2.0.16.js>

## 🔗 订阅地址

<http://127.0.0.1:8767/all.m3u>

在其他局域网设备上播放时，将 `127.0.0.1` 换成运行服务的设备 IP。

访问 `/health` 可查看服务状态，访问 `/diag` 可查看诊断日志。

## 🚀 分流规则

1. Shadowrocket 模块\
   下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.module>
2. Surge / Loon 规则集\
   下载地址：<https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.list>

## 🙏 特别感谢

感谢 Gary’s Club 群友 ll 提供频道 `live_id`。

感谢 [IPTV 直播源总部](https://t.me/iptvorganization)分享算法源码。

感谢 [APTV](https://t.me/AptvPlayer) 和 [nanoTV](https://t.me/nanotvinfo) 作者提供技术帮助。
