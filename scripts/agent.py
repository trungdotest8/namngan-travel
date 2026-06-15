#!/usr/bin/env python3
"""
agent.py — Tour Image Scraper cho Nam Ngân Travel
Crawl ảnh tour → convert WebP → upload Supabase Storage → sinh alt text Claude → sync DB
Python 3.11+
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import csv
import json
import logging
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import aiofiles
import aiohttp
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fake_useragent import UserAgent
from PIL import Image as PillowImage
from tqdm.asyncio import tqdm_asyncio

load_dotenv()
load_dotenv(".env.local", override=False)   # fallback: đọc .env.local nếu .env thiếu key

import os

# Hỗ trợ cả tên biến Next.js (NEXT_PUBLIC_...) lẫn tên ngắn
SUPABASE_URL    = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "tour-galleries")
ANTHROPIC_KEY   = os.getenv("ANTHROPIC_API_KEY", "")

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("agent.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── Hằng số ───────────────────────────────────────────────────────────────────

_UA = UserAgent()

SKIP_URL_PATTERNS = re.compile(
    r'(/page/|\?page=|/category/|/tag/|/search|/login|/cart|/checkout'
    r'|facebook\.com|instagram\.com|youtube\.com|tiktok\.com'
    r'|twitter\.com|zalo\.me|#|javascript:'
    r'|/wp-content/|/wp-includes/|/uploads/'
    r'|\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|zip|mp4|mp3)(\?|$))',
    re.IGNORECASE,
)

THREAD_POOL = ThreadPoolExecutor(max_workers=4)

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class ImageRecord:
    """Metadata một ảnh tour đã tải và xử lý."""
    order:       int
    local_path:  str
    cdn_url:     str  = ""
    alt:         str  = ""
    caption:     str  = ""
    db_updated:  bool = False


@dataclass
class TourRecord:
    """Thông tin một tour sau khi crawl xong."""
    title:      str
    slug:       str
    source_url: str
    crawled_at: str
    images:     list[ImageRecord] = field(default_factory=list)
    db_synced:  bool = False


# ── HTTP Layer ────────────────────────────────────────────────────────────────

def _chrome_headers() -> dict[str, str]:
    """Tạo headers giả lập Chrome để tránh bị block."""
    return {
        "User-Agent":      _UA.chrome,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection":      "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest":  "document",
        "Sec-Fetch-Mode":  "navigate",
        "Sec-Fetch-Site":  "none",
        "Cache-Control":   "max-age=0",
    }


async def fetch_html(url: str, session: aiohttp.ClientSession) -> str | None:
    """
    Tải HTML bằng aiohttp với headers Chrome.
    Nếu gặp 403/429/5xx → fallback sang httpx http2.
    """
    try:
        async with session.get(url, headers=_chrome_headers(), timeout=aiohttp.ClientTimeout(total=20)) as resp:
            if resp.status in (403, 429, 503, 522):
                log.warning("aiohttp %s → %d, thử httpx fallback", url, resp.status)
                return await fetch_html_httpx(url)
            if resp.status != 200:
                log.error("HTTP %d khi tải %s", resp.status, url)
                return None
            return await resp.text(errors="replace")
    except Exception as exc:
        log.warning("aiohttp lỗi (%s) → thử httpx: %s", type(exc).__name__, url)
        return await fetch_html_httpx(url)


async def fetch_html_httpx(url: str) -> str | None:
    """
    Fallback: tải HTML bằng httpx với HTTP/2 (bypass Cloudflare cơ bản).
    Dùng header tối giản để tránh server trả trang rút gọn.
    """
    headers = {
        "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    }
    try:
        async with httpx.AsyncClient(http2=True, follow_redirects=True, timeout=25) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                log.error("httpx HTTP %d: %s", resp.status_code, url)
                return None
            return resp.text
    except Exception as exc:
        log.error("httpx lỗi: %s — %s", url, exc)
        return None


async def download_bytes(url: str, session: aiohttp.ClientSession) -> bytes | None:
    """
    Tải raw bytes (ảnh) qua aiohttp.
    """
    try:
        async with session.get(url, headers=_chrome_headers(), timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                log.warning("Không tải được ảnh %s (HTTP %d)", url, resp.status)
                return None
            return await resp.read()
    except Exception as exc:
        log.warning("Lỗi tải ảnh %s: %s", url, exc)
        return None


# ── Tour Discovery ─────────────────────────────────────────────────────────────

def extract_tour_links(html: str, base_url: str) -> list[str]:
    """
    Trích xuất link tour từ HTML bằng heuristic.
    Tìm trong <article>, <div class*=tour>, <li class*=item>.
    Lọc bỏ link phân trang, mạng xã hội, category.
    """
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    results: list[str] = []

    containers = soup.select(
        "article a, "
        "[class*=tour] a, [class*=Tour] a, "
        "[class*=item] a, [class*=Item] a, "
        "[class*=product] a, [class*=card] a"
    )

    for tag in containers:
        href = tag.get("href", "")
        if not href or not isinstance(href, str):
            continue
        full = urljoin(base_url, href).split("?")[0].split("#")[0]
        if len(full) <= 30:
            continue
        if SKIP_URL_PATTERNS.search(full):
            continue
        parsed = urlparse(full)
        if not parsed.scheme.startswith("http"):
            continue
        if full not in seen:
            seen.add(full)
            results.append(full)

    return results


async def preview_and_confirm(links: list[str], dry_run: bool, yes: bool = False) -> list[str]:
    """
    In 5 link đầu, hỏi user xác nhận trước khi crawl hàng loạt.
    Nếu --dry-run thì trả về rỗng (chỉ liệt kê).
    Nếu --yes thì tự động xác nhận, không hỏi.
    """
    if not links:
        log.info("Không tìm thấy link tour nào.")
        return []

    print(f"\n{'─'*60}")
    print(f"Tìm thấy {len(links)} link tour. 5 link đầu:")
    for i, url in enumerate(links[:5], 1):
        print(f"  {i}. {url}")
    print("─"*60)

    if dry_run:
        print("[--dry-run] Dừng tại đây. Không tải ảnh.")
        return []

    if yes:
        print("[--yes] Tự động xác nhận, bắt đầu crawl...")
        return links

    try:
        ans = input("Bắt đầu crawl? [Y/n]: ").strip().lower()
    except EOFError:
        ans = "y"

    if ans in ("", "y", "yes"):
        return links
    print("Huỷ.")
    return []


# ── Tour Parsing ───────────────────────────────────────────────────────────────

def _extract_title(soup: BeautifulSoup, url: str) -> str:
    """Lấy tiêu đề tour: og:title → h1 → <title> → URL path."""
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return str(og["content"]).strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    title_tag = soup.find("title")
    if title_tag:
        return title_tag.get_text(strip=True).split("|")[0].strip()
    return urlparse(url).path.strip("/").replace("-", " ").title()


def _extract_image_urls(soup: BeautifulSoup, base_url: str) -> list[str]:
    """
    Trích xuất URL ảnh từ og:image và <img> trong vùng nội dung.
    Chỉ lấy URL https://, bỏ icon nhỏ (< 50px nếu có width/height).
    """
    seen: set[str] = set()
    urls: list[str] = []

    # og:image trước
    for meta in soup.find_all("meta", property=re.compile(r"og:image")):
        src = meta.get("content", "")
        if src and src.startswith("https://") and src not in seen:
            seen.add(src)
            urls.append(src)

    # <img> trong vùng bài viết
    content_areas = soup.select(
        "article, .content, .entry-content, .post-content, "
        "[class*=gallery], [class*=slide], [class*=photo], "
        "[class*=image], [class*=tour-detail]"
    ) or [soup]

    for area in content_areas:
        for img in area.find_all("img"):
            src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
            if not src:
                continue
            src = urljoin(base_url, str(src))
            if not src.startswith("https://"):
                continue
            # bỏ icon nhỏ
            try:
                w = int(img.get("width", 0))
                h = int(img.get("height", 0))
                if 0 < w < 50 or 0 < h < 50:
                    continue
            except (ValueError, TypeError):
                pass
            if src not in seen:
                seen.add(src)
                urls.append(src)

    return urls


async def parse_tour_detail(html: str, url: str) -> tuple[str, list[str]]:
    """
    Parse trang chi tiết tour: trả về (title, danh_sách_url_ảnh).
    """
    soup = BeautifulSoup(html, "html.parser")
    title = _extract_title(soup, url)
    images = _extract_image_urls(soup, url)
    return title, images


# ── Image Processing ───────────────────────────────────────────────────────────

def slugify_vi(text: str) -> str:
    """
    Chuyển tiêu đề tiếng Việt sang slug chuẩn SEO.
    Ví dụ: "Tour Bắc Kinh – Thượng Hải" → "tour-bac-kinh-thuong-hai"
    """
    # Normalize unicode → decompose diacritics
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")[:80]


def _convert_to_webp_sync(data: bytes, quality: int = 82) -> bytes:
    """
    Convert bytes ảnh sang WebP bằng Pillow (chạy trong ThreadPool).
    """
    import io
    img = PillowImage.open(io.BytesIO(data)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=4)
    return buf.getvalue()


async def convert_to_webp(data: bytes, quality: int = 82) -> bytes:
    """
    Bất đồng bộ: chạy Pillow convert trong ThreadPool để không block event loop.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(THREAD_POOL, _convert_to_webp_sync, data, quality)


async def save_image(data: bytes, output_dir: Path, slug: str, index: int) -> Path:
    """
    Lưu WebP vào đĩa. Tên file: {slug}-{index:03d}.webp
    Trả về đường dẫn tuyệt đối.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{slug}-{index:03d}.webp"
    path = output_dir / filename
    async with aiofiles.open(path, "wb") as f:
        await f.write(data)
    return path


# ── Supabase Storage ───────────────────────────────────────────────────────────

async def upload_image_to_storage(
    local_path: Path,
    tour_slug: str,
    sb_client,          # supabase.Client
    bucket: str,
) -> str:
    """
    Upload ảnh WebP lên Supabase Storage.
    Bỏ qua nếu file đã tồn tại. Trả về public CDN URL.
    """
    storage_path = f"{tour_slug}/{local_path.name}"

    async def _upload() -> str:
        async with aiofiles.open(local_path, "rb") as f:
            data = await f.read()
        try:
            sb_client.storage.from_(bucket).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": "image/webp", "upsert": "false"},
            )
            log.info("Đã upload: %s", storage_path)
        except Exception as exc:
            msg = str(exc)
            if "already exists" in msg.lower() or "duplicate" in msg.lower() or "23505" in msg:
                log.info("Bỏ qua (đã tồn tại): %s", storage_path)
            else:
                log.error("Upload lỗi %s: %s", storage_path, exc)
                return ""
        public_url = sb_client.storage.from_(bucket).get_public_url(storage_path)
        return public_url

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(THREAD_POOL, lambda: asyncio.run(_upload()))


async def upload_image(
    local_path: Path,
    tour_slug: str,
    sb_client,
    bucket: str,
) -> str:
    """
    Bất đồng bộ upload ảnh lên Supabase Storage trong ThreadPool.
    Trả về CDN URL hoặc rỗng nếu lỗi.
    """
    loop = asyncio.get_running_loop()

    def _sync_upload() -> str:
        with open(local_path, "rb") as f:
            data = f.read()
        storage_path = f"{tour_slug}/{local_path.name}"
        try:
            sb_client.storage.from_(bucket).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": "image/webp", "upsert": "false"},
            )
            log.info("Đã upload: %s", storage_path)
        except Exception as exc:
            msg = str(exc)
            if any(k in msg.lower() for k in ("already exists", "duplicate", "23505", "400")):
                log.info("Bỏ qua (đã tồn tại): %s", storage_path)
            else:
                log.error("Upload lỗi %s: %s", storage_path, exc)
                return ""
        # Luôn lấy public URL dù file đã tồn tại hay vừa upload
        return sb_client.storage.from_(bucket).get_public_url(storage_path)

    return await loop.run_in_executor(THREAD_POOL, _sync_upload)


# ── Alt Text Generation (Claude API) ──────────────────────────────────────────

async def generate_alt_text(
    image_path: Path,
    tour_title: str,
    ant_client,         # anthropic.Anthropic
) -> str:
    """
    Gọi Claude claude-haiku-4-5-20251001 (vision) để sinh alt text tiếng Việt.
    Đọc ảnh WebP → base64 → gửi kèm tên tour.
    Sleep 0.5s sau mỗi lần gọi để tránh rate limit.
    """
    SYSTEM = (
        "Bạn là chuyên gia SEO du lịch. Sinh alt text tiếng Việt cho ảnh tour, "
        "ngắn gọn 10-15 từ, chứa tên điểm đến, không spam từ khóa. "
        "Chỉ trả về alt text, không giải thích."
    )

    async def _call() -> str:
        async with aiofiles.open(image_path, "rb") as f:
            raw = await f.read()
        b64 = base64.standard_b64encode(raw).decode()

        loop = asyncio.get_running_loop()

        def _sync():
            return ant_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=100,
                system=SYSTEM,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type":       "base64",
                                "media_type": "image/webp",
                                "data":       b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": f"Tour: {tour_title}. Sinh alt text cho ảnh này.",
                        },
                    ],
                }],
            )

        resp = await loop.run_in_executor(THREAD_POOL, _sync)
        return resp.content[0].text.strip()

    try:
        result = await _call()
        await asyncio.sleep(0.5)
        return result
    except Exception as exc:
        log.error("Lỗi sinh alt text cho %s: %s", image_path.name, exc)
        await asyncio.sleep(0.5)
        return ""


# ── DB Sync ────────────────────────────────────────────────────────────────────

def _build_image_obj(img: ImageRecord) -> dict:
    """Chuyển ImageRecord thành dict JSON cho cột tours.images."""
    return {
        "order":      img.order,
        "url":        img.cdn_url or img.local_path,
        "alt":        img.alt,
        "caption":    img.caption,
        "local_path": img.local_path,
    }


async def sync_to_db(tour: TourRecord, sb_client) -> bool:
    """
    Upsert tour vào bảng tours (Supabase).
    - Tìm theo slug → merge ảnh mới (không trùng url)
    - Nếu chưa có → insert mới với is_active=False
    - Trả về True nếu thành công
    """
    loop = asyncio.get_running_loop()
    new_images = [_build_image_obj(img) for img in tour.images]

    def _sync():
        try:
            result = (
                sb_client.table("tours")
                .select("id, name, images")
                .eq("slug", tour.slug)
                .limit(1)
                .execute()
            )
            rows = result.data if result and result.data else []
        except Exception as exc:
            log.error("DB select lỗi: %s", exc)
            return False

        now_iso = datetime.now(timezone.utc).isoformat()

        if rows:
            # Tour đã tồn tại — merge ảnh
            existing: list[dict] = rows[0].get("images") or []
            existing_urls = {img.get("url") for img in existing if isinstance(img, dict)}

            merged = list(existing)
            for img_obj in new_images:
                if img_obj["url"] not in existing_urls:
                    merged.append(img_obj)

            try:
                sb_client.table("tours").update({
                    "images":     merged,
                    "source_url": tour.source_url,
                    "updated_at": now_iso,
                }).eq("slug", tour.slug).execute()
                log.info("DB updated tour: %s (%d ảnh)", tour.slug, len(merged))
            except Exception as exc:
                log.error("DB update lỗi: %s", exc)
                return False
        else:
            # Tour chưa có — insert mới
            try:
                sb_client.table("tours").insert({
                    "name":       tour.title,
                    "slug":       tour.slug,
                    "source_url": tour.source_url,
                    "images":     new_images,
                    "is_active":  False,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }).execute()
                log.info("DB inserted tour: %s", tour.slug)
            except Exception as exc:
                log.error("DB insert lỗi: %s", exc)
                return False

        for img in tour.images:
            img.db_updated = True
        return True

    return await loop.run_in_executor(THREAD_POOL, _sync)


# ── Output ─────────────────────────────────────────────────────────────────────

async def write_info_json(tour: TourRecord, tour_dir: Path) -> None:
    """Ghi _info.json cho tour vào folder tương ứng."""
    data = {
        "title":      tour.title,
        "slug":       tour.slug,
        "source_url": tour.source_url,
        "crawled_at": tour.crawled_at,
        "db_synced":  tour.db_synced,
        "images": [
            {
                "order":      img.order,
                "local_path": img.local_path,
                "cdn_url":    img.cdn_url,
                "alt":        img.alt,
                "caption":    img.caption,
                "db_updated": img.db_updated,
            }
            for img in tour.images
        ],
    }
    path = tour_dir / "_info.json"
    async with aiofiles.open(path, "w", encoding="utf-8") as f:
        await f.write(json.dumps(data, ensure_ascii=False, indent=2))
    log.info("Đã ghi %s", path)


def append_summary_csv(tour: TourRecord, csv_path: Path) -> None:
    """Ghi/append một dòng vào _summary.csv tổng kết session."""
    write_header = not csv_path.exists()
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["tour_name", "url", "so_anh", "folder_path", "db_synced"])
        if write_header:
            writer.writeheader()
        writer.writerow({
            "tour_name":   tour.title,
            "url":         tour.source_url,
            "so_anh":      len(tour.images),
            "folder_path": str(Path(tour.images[0].local_path).parent) if tour.images else "",
            "db_synced":   tour.db_synced,
        })


# ── Resume ─────────────────────────────────────────────────────────────────────

def is_tour_done(slug: str, output_dir: Path, check_db: bool) -> bool:
    """
    Kiểm tra xem tour đã hoàn thành chưa để bỏ qua (--resume).
    Điều kiện: _info.json tồn tại + (db_synced nếu --sync-db).
    """
    info_path = output_dir / slug / "_info.json"
    if not info_path.exists():
        return False
    if not check_db:
        return True
    try:
        data = json.loads(info_path.read_text(encoding="utf-8"))
        return bool(data.get("db_synced"))
    except Exception:
        return False


# ── Core: xử lý 1 tour ────────────────────────────────────────────────────────

async def process_tour(
    url: str,
    args: argparse.Namespace,
    session: aiohttp.ClientSession,
    sb_client,
    ant_client,
    semaphore: asyncio.Semaphore,
    csv_path: Path,
) -> TourRecord | None:
    """
    Xử lý toàn bộ pipeline cho 1 tour URL.
    Không crash toàn bộ nếu 1 bước lỗi — log và tiếp tục.
    """
    async with semaphore:
        log.info("Bắt đầu: %s", url)

        # 1. Tải HTML chi tiết
        html = await fetch_html(url, session)
        if not html:
            log.error("Không tải được HTML: %s", url)
            return None

        # 2. Parse title + image URLs
        try:
            title, image_urls = await parse_tour_detail(html, url)
        except Exception as exc:
            log.error("Parse lỗi %s: %s", url, exc)
            return None

        if not title:
            title = urlparse(url).path.strip("/").split("/")[-1]
        slug = slugify_vi(title) or f"tour-{abs(hash(url)) % 100000}"

        # Resume check
        output_dir: Path = Path(args.output)
        if args.resume and is_tour_done(slug, output_dir, check_db=args.sync_db):
            log.info("Bỏ qua (đã có): %s", slug)
            return None

        tour_dir = output_dir / slug
        tour_dir.mkdir(parents=True, exist_ok=True)

        # Giới hạn số ảnh
        image_urls = image_urls[: args.max_images]
        if not image_urls:
            log.warning("Không tìm thấy ảnh: %s", url)
            return None

        tour = TourRecord(
            title=title,
            slug=slug,
            source_url=url,
            crawled_at=datetime.now(timezone.utc).isoformat(),
        )

        # 3. Tải + convert + lưu local
        for idx, img_url in enumerate(image_urls, start=1):
            raw = await download_bytes(img_url, session)
            if not raw:
                continue
            try:
                webp_data = await convert_to_webp(raw, quality=82) if args.webp else raw
                ext = ".webp" if args.webp else Path(urlparse(img_url).path).suffix or ".jpg"
                filename = f"{slug}-{idx:03d}{ext}"
                local_path = tour_dir / filename
                async with aiofiles.open(local_path, "wb") as f:
                    await f.write(webp_data)
                tour.images.append(ImageRecord(order=idx, local_path=str(local_path)))
                log.info("  Lưu: %s", local_path.name)
            except Exception as exc:
                log.error("  Xử lý ảnh %d lỗi: %s", idx, exc)

        if not tour.images:
            log.warning("Không có ảnh nào được lưu: %s", slug)
            return None

        # 4. Upload Supabase Storage
        if args.upload and sb_client:
            for img in tour.images:
                try:
                    cdn = await upload_image(Path(img.local_path), slug, sb_client, SUPABASE_BUCKET)
                    if cdn:
                        img.cdn_url = cdn
                except Exception as exc:
                    log.error("Upload lỗi %s: %s", img.local_path, exc)

        # 5. Sinh alt text
        if args.gen_alt and ant_client:
            for img in tour.images:
                try:
                    img.alt = await generate_alt_text(Path(img.local_path), title, ant_client)
                    log.info("  Alt [%d]: %s", img.order, img.alt[:60])
                except Exception as exc:
                    log.error("Alt text lỗi: %s", exc)

        # 6. Sync DB
        if args.sync_db and sb_client:
            try:
                tour.db_synced = await sync_to_db(tour, sb_client)
            except Exception as exc:
                log.error("Sync DB lỗi: %s", exc)

        # 7. Ghi _info.json + CSV
        await write_info_json(tour, tour_dir)
        append_summary_csv(tour, csv_path)

        log.info("Xong: %s (%d ảnh)", slug, len(tour.images))
        return tour


# ── Main ───────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    """Định nghĩa và parse CLI arguments."""
    p = argparse.ArgumentParser(
        description="Tour Image Scraper — Nam Ngân Travel",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Ví dụ:
  python agent.py "https://example.com/tours" --dry-run
  python agent.py "https://example.com/tours" --workers 3 --max-tours 5 --webp --upload --gen-alt --sync-db
""",
    )
    p.add_argument("url", help="URL trang danh sách tour (hoặc trang chi tiết 1 tour)")
    p.add_argument("--workers",    type=int,  default=3,       help="Số tour xử lý song song (default: 3)")
    p.add_argument("--max-tours",  type=int,  default=50,      help="Số tour tối đa (default: 50)")
    p.add_argument("--max-images", type=int,  default=20,      help="Số ảnh tối đa mỗi tour (default: 20)")
    p.add_argument("--output",     type=str,  default="tours", help="Thư mục lưu kết quả (default: tours)")
    p.add_argument("--resume",     action="store_true",        help="Bỏ qua tour đã có _info.json")
    p.add_argument("--webp",       action="store_true", default=True, help="Convert sang WebP (default: bật)")
    p.add_argument("--no-webp",    action="store_false", dest="webp", help="Không convert WebP")
    p.add_argument("--dry-run",    action="store_true",        help="Chỉ liệt kê link, không tải")
    p.add_argument("--yes", "-y",  action="store_true",        help="Tự động xác nhận, không hỏi")
    p.add_argument("--single",     action="store_true",        help="Crawl đúng 1 URL (không discovery link con)")
    p.add_argument("--upload",     action="store_true",        help="Upload lên Supabase Storage")
    p.add_argument("--gen-alt",    action="store_true",        help="Sinh alt text bằng Claude API")
    p.add_argument("--sync-db",    action="store_true",        help="Upsert vào bảng tours Supabase")
    return p.parse_args()


async def main() -> None:
    """Luồng chính: crawl → tải ảnh → upload → alt text → sync DB."""
    args = parse_args()

    # Khởi tạo Supabase client
    sb_client = None
    if args.upload or args.sync_db:
        if not SUPABASE_URL or not SUPABASE_KEY:
            log.error("Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong .env")
            sys.exit(1)
        try:
            from supabase import create_client
            sb_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            log.info("Supabase client: OK")
        except Exception as exc:
            log.error("Không thể kết nối Supabase: %s", exc)
            sys.exit(1)

    # Khởi tạo Anthropic client
    ant_client = None
    if args.gen_alt:
        if not ANTHROPIC_KEY:
            log.error("Thiếu ANTHROPIC_API_KEY trong .env")
            sys.exit(1)
        try:
            import anthropic
            ant_client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
            log.info("Anthropic client: OK")
        except Exception as exc:
            log.error("Không thể khởi tạo Anthropic client: %s", exc)
            sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "_summary.csv"

    connector = aiohttp.TCPConnector(limit=20, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:

        # Bước 1: Tải trang listing
        log.info("Tải trang: %s", args.url)
        html = await fetch_html(args.url, session)
        if not html:
            log.error("Không tải được trang listing. Thoát.")
            sys.exit(1)

        # Bước 2: Phát hiện link tour
        if args.single:
            log.info("--single: crawl đúng 1 URL, bỏ qua discovery.")
            links = [args.url]
        else:
            links = extract_tour_links(html, args.url)
            # Nếu không tìm thấy link con → có thể đây là trang chi tiết tour
            if not links:
                log.info("Không có link con → xử lý như trang chi tiết tour đơn.")
                links = [args.url]

        links = links[: args.max_tours]

        # Bước 3: Xác nhận với user
        links = await preview_and_confirm(links, args.dry_run, args.yes)
        if not links:
            return

        # Bước 4: Xử lý song song
        semaphore = asyncio.Semaphore(args.workers)
        tasks = [
            process_tour(url, args, session, sb_client, ant_client, semaphore, csv_path)
            for url in links
        ]
        results = await tqdm_asyncio.gather(*tasks, desc="Crawling tours")

    done = [r for r in results if r is not None]
    log.info("─"*60)
    log.info("Hoàn thành: %d/%d tour | CSV: %s", len(done), len(links), csv_path)
    if done:
        total_imgs = sum(len(t.images) for t in done)
        log.info("Tổng ảnh: %d | Bucket: %s", total_imgs, SUPABASE_BUCKET if args.upload else "không upload")


if __name__ == "__main__":
    asyncio.run(main())
