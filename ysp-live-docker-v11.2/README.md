# 📺 央视频全频道直播 v11.2 旗舰版

📢 **首发渠道**　[Gary’s Club 社区](https://t.me/garysclub) · [Gary’s Club Channel 频道](https://t.me/garysclubchannel)\
请认准以上发布渠道，其他转载均非作者发布。

✨ **核心功能**　内置 64 个直播频道，53 个设有节目回看入口，26 个优先使用已注册设备的高码率线路，部分频道支持真 4K。

🛠 **v11.2 更新**　切回频道时重新读取当前清单，复用已取得的播放地址。修复备用地址参数被截断的问题，改进回看分片转发，更新新疆卫视及三个剧场频道的 SID。目前部分运营商访问卫视还会出现卡顿或者偶尔无法播放，请重试几次即可。

💻 **电脑版**　[下载 v11.2 电脑版 ZIP](https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v11.2.zip)\
解压后使用 Python 3.10 或更新版本启动。Windows 用 `python ysp-live-v11.2.py`，macOS / Linux 用 `python3 ysp-live-v11.2.py`。

🐳 **Docker 版**　[下载 v11.2 Docker ZIP](https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-docker-v11.2.zip)\
解压后运行 `docker compose up -d --build`。升级时先停止旧容器，沿用原 `data` 目录或数据卷。

📱 **播放器脚本**\
**APTV / mytv-android**　[Python v11.2 脚本](https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v11.2.py)\
**nanoTV**　JavaScript 脚本地址暂缺，原 2.0.16 链接已返回 404。

🔗 **订阅地址**　`http://127.0.0.1:8767/all.m3u`\
局域网播放时，将 `127.0.0.1` 换成服务设备的 IP。健康检查用 `/health`，诊断日志用 `/diag`。

🚀 **分流规则**　[Shadowrocket 模块](https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.module) · [Surge / Loon 规则集](https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.list)

🙏 **特别感谢**　[IPTV 直播源总部](https://t.me/iptvorganization) 分享算法源码，Gary’s Club 群友 ll 提供频道 live_id，[APTV](https://t.me/AptvPlayer) 和 [nanoTV](https://t.me/nanotvinfo) 作者提供技术帮助。
