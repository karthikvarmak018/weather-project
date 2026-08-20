import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables before importing services
load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from services.weather import (
    get_weather,
    get_forecast,
    get_air_quality,
    reverse_geocode,
    CityNotFoundError
)
from services.news import get_news

app = FastAPI(
    title="Skyline — Weather & News Intelligence Hub",
    description="Full-stack weather forecasting, atmospheric analytics, and real-time global news platform.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def serve_home():
    """Serve the single-page application directly at the root URL."""
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Skyline Weather & News Intelligence Hub API 2.0"}


@app.get("/api/dashboard")
def get_unified_dashboard(
    city: str = Query("London", description="Target city name"),
    units: str = Query("metric", pattern="^(metric|imperial)$", description="metric (°C) or imperial (°F)"),
    category: str = Query("general", description="News category"),
    country_code: Optional[str] = Query(None, description="Country code for news (2 letters)"),
    q: Optional[str] = Query(None, description="Topic search query for news")
):
    """
    Unified dashboard endpoint that retrieves real-time weather, 24h & 5-day forecasts,
    air quality index, smart AI advice, and curated news articles in a single payload.
    """
    city_str = city if isinstance(city, str) else "London"
    unit_str = units if isinstance(units, str) else "metric"
    cat_str = category if isinstance(category, str) else "general"
    code_str = country_code if isinstance(country_code, str) else None
    q_str = q if isinstance(q, str) else None

    try:
        weather_data = get_weather(city=city_str, units=unit_str)
    except CityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather service error: {str(e)}")

    # If country_code is not explicitly passed, infer it from the resolved weather country
    inferred_country = (code_str or weather_data.get("country") or "us").lower()
    if len(inferred_country) > 2:
        inferred_country = "us"

    news_data = get_news(
        country_code=inferred_country,
        category=cat_str,
        query=q_str,
        page_size=8
    )

    return {
        "status": "success",
        "weather": weather_data,
        "news": news_data
    }


@app.get("/api/weather")
def get_weather_endpoint(
    city: str = Query(..., description="Target city name"),
    units: str = Query("metric", pattern="^(metric|imperial)$")
):
    """Retrieve full current weather metrics, forecasts, and AI lifestyle insights."""
    try:
        return get_weather(city=city, units=units)
    except CityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/forecast")
def get_forecast_endpoint(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    units: str = Query("metric", pattern="^(metric|imperial)$")
):
    """Retrieve 24-hour hourly and 5-day extended forecasts for given coordinates."""
    return get_forecast(lat=lat, lon=lon, units=units)


@app.get("/api/air-quality")
def get_air_quality_endpoint(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Retrieve Air Quality Index (AQI 1-5) and pollutant concentrations (PM2.5, PM10, etc.)."""
    return get_air_quality(lat=lat, lon=lon)


@app.get("/api/news")
def get_news_endpoint(
    country_code: str = Query("us", description="2-letter country code"),
    category: str = Query("general", description="Category: general, technology, business, science, health, entertainment, sports"),
    q: Optional[str] = Query(None, description="Optional search query"),
    page_size: int = Query(8, ge=1, le=20)
):
    """Retrieve categorized or searched news articles with rich media metadata."""
    return get_news(country_code=country_code, category=category, query=q, page_size=page_size)


@app.get("/api/reverse-geocode")
def get_reverse_geocode_endpoint(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Resolve latitude and longitude coordinates into a human-friendly city and country name."""
    return reverse_geocode(lat=lat, lon=lon)


# Backward-compatible endpoint for existing consumers
@app.get("/dashboard")
def legacy_dashboard(city: str = "London", country_code: str = "us"):
    try:
        weather = get_weather(city)
    except CityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    news = get_news(country_code)
    return {
        "weather": weather,
        "news": news
    }


# Mount static files folder
app.mount("/static", StaticFiles(directory="static", html=True), name="static")