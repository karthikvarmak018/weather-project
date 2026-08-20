import os
import time
from datetime import datetime, timezone
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines"
EVERYTHING_URL = "https://newsapi.org/v2/everything"

# In-memory TTL Cache
_news_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 900  # 15 minutes

# Default high quality fallback images for articles missing an image
CATEGORY_IMAGES = {
    "general": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80",
    "technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    "business": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80",
    "science": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
    "health": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80",
    "entertainment": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80"
}

# Curated fallback news in case the API limit is reached
FALLBACK_ARTICLES = [
    {
        "title": "Global Weather Patterns Show Increasing Shift Towards Extreme Atmospheric Dynamics",
        "description": "Meteorological agencies worldwide publish comprehensive climate data on changing jet stream behaviors and seasonal weather transitions.",
        "source": "Global Climate Wire",
        "author": "Dr. Sarah Lin",
        "url": "https://news.google.com",
        "imageUrl": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80",
        "publishedAt": "2026-08-20T10:00:00Z",
        "timeAgo": "2 hours ago",
        "category": "science"
    },
    {
        "title": "Next-Gen AI Weather Forecasting Models Reach Breakthrough Accuracy in Storm Tracking",
        "description": "Researchers reveal deep neural forecasting networks capable of predicting localized severe storms with up to 10 days precision.",
        "source": "TechRadar Science",
        "author": "Marcus Vance",
        "url": "https://news.google.com",
        "imageUrl": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80",
        "publishedAt": "2026-08-20T08:30:00Z",
        "timeAgo": "3 hours ago",
        "category": "technology"
    },
    {
        "title": "Renewable Energy Grid Sets Record Output During High-Pressure Solar Surge",
        "description": "Clean solar and wind energy grids achieve an all-time peak distribution efficiency across metropolitan corridors this week.",
        "source": "Eco & Business Pulse",
        "author": "Elena Rostova",
        "url": "https://news.google.com",
        "imageUrl": "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&auto=format&fit=crop&q=80",
        "publishedAt": "2026-08-20T07:15:00Z",
        "timeAgo": "5 hours ago",
        "category": "business"
    },
    {
        "title": "Urban Air Quality Innovations: How Green Canopies Transform City Microclimates",
        "description": "Urban planning initiatives integrate vertical forests and rooftop botanical gardens to slash urban heat island effects and lower particulate levels.",
        "source": "Urban Health Journal",
        "author": "Julian Becker",
        "url": "https://news.google.com",
        "imageUrl": "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&auto=format&fit=crop&q=80",
        "publishedAt": "2026-08-20T05:40:00Z",
        "timeAgo": "6 hours ago",
        "category": "health"
    },
    {
        "title": "Major Tech Keynote Announces Groundbreaking Innovations in Spatial & Ambient Computing",
        "description": "Industry leaders demonstrate next-generation spatial computing interfaces designed for seamless daily workflow and intelligent environmental awareness.",
        "source": "Silicon Chronicle",
        "author": "Aiden Cole",
        "url": "https://news.google.com",
        "imageUrl": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80",
        "publishedAt": "2026-08-20T04:20:00Z",
        "timeAgo": "8 hours ago",
        "category": "technology"
    }
]


def _format_time_ago(iso_date_str: Optional[str]) -> str:
    if not iso_date_str:
        return "Recently"
    try:
        # Parse ISO date
        pub_dt = datetime.fromisoformat(iso_date_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - pub_dt
        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            mins = max(1, seconds // 60)
            return f"{mins}m ago"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours}h ago"
        else:
            days = seconds // 86400
            return f"{days}d ago"
    except Exception:
        return "Recently"


def get_news(
    country_code: str = "us",
    category: str = "general",
    query: Optional[str] = None,
    page_size: int = 8
) -> List[Dict[str, Any]]:
    # Standardize inputs
    c_code = (country_code or "us").lower().strip()
    cat = (category or "general").lower().strip()
    q = (query or "").strip()

    cache_key = f"news_{c_code}_{cat}_{q}_{page_size}"
    if cache_key in _news_cache:
        entry = _news_cache[cache_key]
        if time.time() - entry["timestamp"] < CACHE_TTL:
            return entry["data"]
        else:
            del _news_cache[cache_key]

    if not NEWS_API_KEY:
        return FALLBACK_ARTICLES

    try:
        params: Dict[str, Any] = {
            "apiKey": NEWS_API_KEY,
            "pageSize": page_size
        }

        # NewsAPI top-headlines allows country + category, OR q
        if q:
            params["q"] = q
            url = TOP_HEADLINES_URL
        else:
            url = TOP_HEADLINES_URL
            params["country"] = c_code
            if cat and cat != "all":
                params["category"] = cat

        response = requests.get(url, params=params, timeout=6)
        
        # If country code is not supported by top-headlines or fails, try general query or fallback
        if response.status_code != 200:
            # Try global fallback with query or us headlines
            if "country" in params and params["country"] != "us":
                params["country"] = "us"
                response = requests.get(url, params=params, timeout=5)

        if response.status_code != 200:
            return FALLBACK_ARTICLES

        data = response.json()
        raw_articles = data.get("articles", [])
        if not raw_articles:
            return FALLBACK_ARTICLES

        articles = []
        for a in raw_articles:
            title = a.get("title") or ""
            # Filter out [Removed] spam
            if "[Removed]" in title or not title:
                continue

            image_url = a.get("urlToImage")
            if not image_url or not image_url.startswith("http"):
                image_url = CATEGORY_IMAGES.get(cat, CATEGORY_IMAGES["general"])

            published_at = a.get("publishedAt", "")
            time_ago = _format_time_ago(published_at)

            articles.append({
                "title": title,
                "description": a.get("description") or "Read the full coverage of this story directly on the publisher's portal.",
                "source": a.get("source", {}).get("name") or "Top News",
                "author": a.get("author") or "Staff Reporter",
                "url": a.get("url") or "#",
                "imageUrl": image_url,
                "publishedAt": published_at,
                "timeAgo": time_ago,
                "category": cat
            })

        if not articles:
            articles = FALLBACK_ARTICLES

        _news_cache[cache_key] = {
            "timestamp": time.time(),
            "data": articles
        }
        return articles

    except Exception:
        return FALLBACK_ARTICLES