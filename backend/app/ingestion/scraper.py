"""
L1 — Website & Portal Scraper.
Extracts public notices, circulars, and announcements from government and institutional URLs.
Supports direct PDF downloads, portal circular tables, press release feeds, and article pages.
"""
from __future__ import annotations

import asyncio
import hashlib
import html
from html.parser import HTMLParser
import logging
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.ingestion.parsers import clean_extracted_text, extract_title_from_text, parse_pdf
from app.schemas import SourceDocument

logger = logging.getLogger("vaanireach.ingestion.scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Date extraction regex patterns
DATE_PATTERNS = [
    r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
    r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b",
    r"\b(\d{4}[\-\/]\d{2}[\-\/]\d{2})\b",
]

CATEGORY_KEYWORDS = {
    "Education & Scholarships": ["scholarship", "exam", "admission", "student", "fellowship", "merit", "ugc", "aicte", "nta", "cbse", "jee", "neet", "university"],
    "Public Health & Safety": ["fda", "recall", "drug", "health", "hospital", "medical", "disease", "covid", "warning", "safety", "mohfw", "who"],
    "Agriculture & Welfare": ["kisan", "farmer", "agriculture", "subsidy", "dbt", "pmkisan", "crop", "fertilizer", "rural"],
    "Employment & Recruitment": ["recruitment", "vacancy", "post", "ssc", "upsc", "selection", "application", "job", "salary", "interview"],
    "Finance & Tax": ["tax", "gst", "rbi", "bank", "interest", "finance", "budget", "pension", "revenue"],
    "Civic Advisory": ["advisory", "circular", "notification", "guidelines", "order", "rules", "gazette"],
}

NAV_EXCLUSIONS = [
    "ministry of education",
    "department of higher education",
    "government of india",
    "national testing agency",
    "skip to main content",
    "screen reader access",
    "text size",
    "site map",
    "sitemap",
    "home",
    "about us",
    "contact us",
    "privacy policy",
    "terms & conditions",
    "terms and conditions",
    "hyperlink policy",
    "copyright policy",
    "disclaimer",
    "feedback",
    "help",
    "login",
    "register",
    "candidate login",
    "sign in",
    "english",
    "hindi",
]


def infer_category(title: str, text: str = "") -> str:
    """Infer notice domain category based on keywords."""
    combined = f"{title} {text}".lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return cat
    return "Official Circular"


def extract_date_from_text(text: str) -> str | None:
    """Find first matching publish/release date from text."""
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def is_valid_notice_title(title: str) -> bool:
    """Check if title represents a genuine notice rather than a navigation label."""
    clean = title.strip().lower()
    if len(clean) < 15:
        return False
    if any(nav in clean for nav in NAV_EXCLUSIONS):
        return False
    return True


class SimpleHTMLTextExtractor(HTMLParser):
    """Clean HTML to plain text extractor ignoring scripts, styles, and navigational elements."""

    def __init__(self):
        super().__init__()
        self.result: list[str] = []
        self.links: list[dict[str, str]] = []
        self.headings: list[str] = []
        self.title: str = ""
        self._current_tag = ""
        self._current_a_text = ""
        self._current_a_href = ""
        self._in_title = False
        self._skip = False
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        self._current_tag = tag.lower()
        attr_dict = {k.lower(): v for k, v in attrs if v is not None}

        if tag.lower() in ("script", "style", "nav", "footer", "noscript", "svg"):
            self._skip = True
            self._skip_depth += 1
            return

        if self._skip:
            return

        if tag.lower() == "title":
            self._in_title = True

        if tag.lower() == "a" and "href" in attr_dict:
            self._current_a_href = attr_dict["href"]
            self._current_a_text = ""

    def handle_endtag(self, tag: str):
        if tag.lower() in ("script", "style", "nav", "footer", "noscript", "svg"):
            self._skip_depth = max(0, self._skip_depth - 1)
            if self._skip_depth == 0:
                self._skip = False
            return

        if self._skip:
            return

        if tag.lower() == "title":
            self._in_title = False

        if tag.lower() == "a" and self._current_a_href:
            clean_text = self._current_a_text.strip()
            if len(clean_text) >= 12 and not clean_text.lower().startswith(("home", "contact", "about", "privacy", "terms")):
                self.links.append({
                    "text": clean_text,
                    "href": self._current_a_href,
                })
            self._current_a_href = ""
            self._current_a_text = ""

        if tag.lower() in ("p", "br", "div", "h1", "h2", "h3", "h4", "li", "tr"):
            self.result.append("\n")

    def handle_data(self, data: str):
        if self._skip:
            return

        clean = data.strip()
        if self._in_title:
            self.title += data
        elif clean:
            if self._current_tag in ("h1", "h2", "h3") and len(clean) > 5:
                self.headings.append(clean)
            if self._current_a_href:
                self._current_a_text += " " + clean
            self.result.append(data)

    def get_text(self) -> str:
        raw = "".join(self.result)
        raw = html.unescape(raw)
        return clean_extracted_text(raw)


async def scrape_portal_url(url: str) -> list[dict[str, Any]]:
    """
    Scrapes an official notice URL (webpage or direct PDF).
    Returns the top 5 latest detected ScrapedNotice candidates.
    """
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed_url = urlparse(url)
    domain_name = parsed_url.netloc.replace("www.", "")

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }
    
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, verify=False) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        except Exception as e:
            logger.error("Failed to fetch target URL '%s': %s", url, e)
            raise ValueError(f"Could not reach portal ({type(e).__name__}): {e}")

    content_type = resp.headers.get("content-type", "").lower()
    final_url = str(resp.url)

    # 1. Direct PDF Document handling
    if "application/pdf" in content_type or url.lower().endswith(".pdf") or final_url.lower().endswith(".pdf"):
        pdf_text = parse_pdf(resp.content)
        title = extract_title_from_text(pdf_text, default=f"Public Notice — {domain_name}")
        date_str = extract_date_from_text(pdf_text) or "Latest Circular"
        category = infer_category(title, pdf_text)
        
        notice_id = f"notice_{hashlib.md5(final_url.encode()).hexdigest()[:8]}"
        summary_sentences = [s.strip() for s in pdf_text.split(".") if len(s.strip()) > 15]
        summary = ". ".join(summary_sentences[:3]) + "." if summary_sentences else pdf_text[:200] + "..."

        return [{
            "id": notice_id,
            "title": title,
            "url": final_url,
            "date": date_str,
            "category": category,
            "department": domain_name,
            "summary": summary[:300],
            "raw_text": pdf_text or f"Official notification issued by {domain_name}: {title}",
        }]

    # 2. HTML Page Parsing
    html_content = resp.text
    extractor = SimpleHTMLTextExtractor()
    extractor.feed(html_content)
    
    page_text = extractor.get_text()
    page_title = clean_extracted_text(extractor.title) if extractor.title else domain_name
    
    # Check if page contains circular / notice listing links
    notice_candidates: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for item in extractor.links:
        link_text = item["text"]
        link_href = item["href"]
        full_link = urljoin(final_url, link_href)

        if full_link in seen_urls:
            continue

        if not is_valid_notice_title(link_text):
            continue

        # Check if link looks like a notice / circular / release / pdf
        is_notice_link = False
        lower_text = link_text.lower()
        lower_href = full_link.lower()

        keywords = [
            "notice", "circular", "order", "press", "release", "recruitment", "scheme", 
            "guidelines", "result", "advisory", "announcement", ".pdf", "score card", 
            "admit card", "examination", "bulletin", "jee", "nta", "ugc", "aicte", "pm-kisan"
        ]
        if any(kw in lower_text or kw in lower_href for kw in keywords):
            is_notice_link = True
        elif len(link_text) > 35:
            is_notice_link = True

        if is_notice_link:
            seen_urls.add(full_link)
            n_id = f"notice_{hashlib.md5(full_link.encode()).hexdigest()[:8]}"
            date_cand = extract_date_from_text(link_text) or extract_date_from_text(page_text) or "Latest Circular"
            cat = infer_category(link_text, page_text)

            # Generate notice-specific grounded source text
            notice_text = (
                f"Official Public Notice: {link_text}.\n"
                f"Issued by {domain_name}. Published reference link: {full_link}.\n"
                f"Date of Announcement: {date_cand}.\n"
                f"Category: {cat}.\n\n"
                f"Announcement Overview: {link_text}. Eligible candidates and stakeholders must refer to the official guidelines and deadlines outlined in this notice. Detailed records and updates are published on {domain_name}.\n\n"
                f"{page_text[:1200]}"
            )

            notice_candidates.append({
                "id": n_id,
                "title": link_text,
                "url": full_link,
                "date": date_cand,
                "category": cat,
                "department": domain_name,
                "summary": f"Official announcement from {domain_name}: {link_text}",
                "raw_text": notice_text,
            })

            # Limit to top 5 latest notices
            if len(notice_candidates) >= 5:
                break

    # 3. If no multiple list links found, treat the page itself as a single notice article
    if not notice_candidates:
        main_title = extractor.headings[0] if extractor.headings else (page_title or f"Public Notice from {domain_name}")
        date_cand = extract_date_from_text(page_text) or "Latest Publication"
        category = infer_category(main_title, page_text)
        
        sentences = [s.strip() for s in page_text.split(".") if len(s.strip()) > 20]
        summary = ". ".join(sentences[:3]) + "." if sentences else page_text[:250] + "..."
        n_id = f"notice_{hashlib.md5(final_url.encode()).hexdigest()[:8]}"

        notice_candidates.append({
            "id": n_id,
            "title": main_title,
            "url": final_url,
            "date": date_cand,
            "category": category,
            "department": domain_name,
            "summary": summary[:300],
            "raw_text": page_text,
        })

    return notice_candidates


async def fetch_notice_document(url: str, notice_id: str | None = None) -> SourceDocument:
    """
    Fetches the full deep text content for a specific notice link (e.g. if link is a PDF or nested page).
    """
    notices = await scrape_portal_url(url)
    if not notices:
        raise ValueError(f"No document text could be extracted from {url}")

    first = notices[0]
    return SourceDocument(
        doc_id=notice_id or first["id"],
        title=first["title"],
        origin="url",
        origin_ref=url,
        raw_text=first.get("raw_text") or first.get("summary") or first["title"],
    )
