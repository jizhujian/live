"""Decode one video frame per channel from a running 20261124 subscription."""
import argparse
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import time
import urllib.parse
import urllib.request


def check(url, timeout):
    start = time.monotonic()
    command = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "warning", "-xerror",
        "-rw_timeout", str(timeout * 1000000), "-analyzeduration", "2000000",
        "-probesize", "2000000", "-threads", "1", "-i", url,
        "-map", "0:v:0", "-frames:v", "1", "-f", "framemd5", "-",
    ]
    env = os.environ.copy()
    host = urllib.parse.urlsplit(url).hostname
    env["no_proxy"] = ",".join(filter(None, [env.get("no_proxy", env.get("NO_PROXY")), host]))
    env["NO_PROXY"] = env["no_proxy"]
    http_status = None
    try:
        p = subprocess.run(command, capture_output=True, timeout=timeout, env=env)
        result = "frame" if p.returncode == 0 and any(line.startswith(b"0,") for line in p.stdout.splitlines()) else "no_frame"
        if result != "frame":
            status = re.search(rb"(?:HTTP error |Server returned |HTTP/1\.[01] )([45]\d\d)", p.stderr)
            http_status = int(status[1]) if status else None
    except subprocess.TimeoutExpired:
        result = "timeout"
    return {"channel": urllib.parse.urlsplit(url).path.strip("/").removesuffix(".m3u8"),
            "result": result, "http_status": http_status, "seconds": round(time.monotonic() - start, 1)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base-url", default="http://127.0.0.1:8767")
    ap.add_argument("--timeout", type=int, default=55)
    ap.add_argument("channels", nargs="*")
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        ap.error("测试首帧需要 ffmpeg")
    base = args.base_url.rstrip("/")
    op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with op.open(base+"/health", timeout=8) as response:
        if json.load(response).get("version") != "20261124":
            ap.error("测试端口运行的不是 20261124")
    with op.open(base+"/all.m3u", timeout=8) as response:
        urls = [line.strip() for line in response.read().decode().splitlines()
                if line.startswith(base+"/") and line.endswith(".m3u8")]
    slugs = {url.rsplit("/", 1)[1][:-5]: url for url in urls}
    unknown = set(args.channels)-slugs.keys()
    if not slugs or unknown:
        ap.error("订阅为空或含有未知频道 " + ", ".join(sorted(unknown)))
    passed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [pool.submit(check, slugs[slug], args.timeout) for slug in args.channels or slugs]
        for future in concurrent.futures.as_completed(jobs):
            row = future.result()
            print(json.dumps(row,ensure_ascii=False),flush=True)
            passed += row["result"] == "frame"
    print(f"{passed}/{len(jobs)} 个频道解码出首帧",flush=True)
    return int(passed != len(jobs))


if __name__ == "__main__":
    raise SystemExit(main())
