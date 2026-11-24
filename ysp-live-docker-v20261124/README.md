📺 央视频全频道直播 v20261124 旗舰版

📢 **由 Gary’s Club 首发**

Gary’s Club 社区

https://t.me/garysclub

Gary’s Club Channel 频道

https://t.me/garysclubchannel

感谢 Gary’s Club 群友 ll 提供频道 live_id，感谢 IPTV 直播源总部分享算法源码，感谢 APTV 和 nanoTV 作者提供技术帮助。

✨ **介绍**

共收录 64 个直播频道，其中 53 个设有节目回看入口，26 个支持高码率线路，部分频道支持真 4K。

支持高码率的普通频道默认先播 1080p。持续观看约 10 秒后，网关开始准备高码率源，就绪后自动切换，无需重新选台。原生 4K/8K 频道直接尝试高码率线路。

🛠 **安装方法**

💻 **电脑版**

下载桌面包

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v20261124.zip

解压后，在脚本目录打开终端，使用 Python 3.10 或更高版本启动。

Windows 启动命令

python ysp-live-v20261124.py

macOS / Linux 启动命令

python3 ysp-live-v20261124.py

如需使用备用引擎，请安装 Node.js，并将 ysp-engine.js 与 Python 脚本放在同一目录。

🐳 **Docker 版**

下载 Docker 包

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-docker-v20261124.zip

解压后，在 docker-compose.yml 所在目录运行

docker compose up -d --build

📱 **播放器脚本**

APTV / mytv-android

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v20261124.py

nanoTV

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp-live-v20261124.js

🔗 **订阅地址**

本机播放时，在播放器中添加

http://127.0.0.1:8767/all.m3u

在其他局域网设备上播放时，将 127.0.0.1 换成网关设备的局域网 IP。访问 /health 可查看版本和运行状态，访问 /diag 可查看播放线路和诊断日志。

🚀 **分流规则**

Shadowrocket｜导入并启用直连模块

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.module

Surge / Loon｜添加远程规则集，策略选择 DIRECT

https://garysclub.sharewithyou.dpdns.org/ysp-live/ysp.list
