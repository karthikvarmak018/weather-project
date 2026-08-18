import requests
import os

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2/top-headlines"

def get_news(country_code: str = "us", category: str = "general"):
    params = {
        "country": country_code,
        "category": category,
        "apiKey": NEWS_API_KEY,
        "pageSize": 5
    }
    response = requests.get(BASE_URL, params=params)
    
    if response.status_code != 200:
        return {"error": "Unable to fetch news"}
    
    data = response.json()
    articles = [
        {
            "title": a["title"],
            "source": a["source"]["name"],
            "url": a["url"]
        }
        for a in data.get("articles", [])
    ]
    return articles