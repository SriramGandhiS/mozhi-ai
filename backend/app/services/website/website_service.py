import asyncio
import ipaddress
import socket
from typing import Dict, Optional
from urllib.parse import urlparse

import httpx
import trafilatura
from bs4 import BeautifulSoup


class UnsafeURLError(ValueError):
    pass


def validate_public_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeURLError("Only HTTP and HTTPS URLs are permitted.")
    if not parsed.hostname:
        raise UnsafeURLError("Invalid URL hostname.")

    hostname = parsed.hostname.lower()
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise UnsafeURLError("Access to local/loopback addresses is not permitted.")

    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for info in addr_info:
            ip_str = info[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                raise UnsafeURLError("Access to private or internal network addresses is not permitted.")
    except socket.gaierror as exc:
        raise UnsafeURLError(f"Could not resolve hostname: {hostname}") from exc

    return url


async def extract_article_from_url(url: str) -> Dict[str, Optional[str]]:
    safe_url = await asyncio.to_thread(validate_public_url, url)

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=False,
        headers={"User-Agent": "LinguaAI-Bot/1.0 (+https://lingua-ai.local)"},
    ) as client:
        resp = await client.get(safe_url)
        if resp.status_code in (301, 302, 303, 307, 308):
            redirect_url = resp.headers.get("location", "")
            if redirect_url:
                safe_redirect = await asyncio.to_thread(validate_public_url, redirect_url)
                resp = await client.get(safe_redirect)
        resp.raise_for_status()
        html = resp.text

    extracted = await asyncio.to_thread(
        trafilatura.extract,
        html,
        include_comments=False,
        include_tables=True,
        no_fallback=False,
    )

    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else None

    if not extracted:
        # Fallback to BeautifulSoup paragraph extraction
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all(["h1", "h2", "h3", "p", "li"])]
        extracted = "\n\n".join(p for p in paragraphs if len(p) > 20)

    if not extracted or not extracted.strip():
        raise ValueError("Could not extract readable article content from the provided URL.")

    return {
        "title": title,
        "content": extracted.strip(),
        "url": safe_url,
    }
