import requests
import os

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
OWM_GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"

# Nominatim requires a descriptive User-Agent identifying the app
NOMINATIM_HEADERS = {
    "User-Agent": "SkylineWeatherApp/1.0 (personal project)"
}


class CityNotFoundError(Exception):
    pass


def _geocode_openweather(city: str):
    """Try OpenWeatherMap's geocoding first (fast, official)."""
    params = {"q": city, "limit": 1, "appid": WEATHER_API_KEY}
    response = requests.get(OWM_GEO_URL, params=params)

    if response.status_code != 200:
        return None

    data = response.json()
    if not data:
        return None

    return {
        "lat": data[0]["lat"],
        "lon": data[0]["lon"],
        "name": data[0].get("name", city),
    }


def _geocode_nominatim(city: str):
    """Fallback: OpenStreetMap's Nominatim, better for small villages."""
    params = {"q": city, "format": "json", "limit": 1}
    response = requests.get(NOMINATIM_URL, params=params, headers=NOMINATIM_HEADERS)

    if response.status_code != 200:
        return None

    data = response.json()
    if not data:
        return None

    result = data[0]
    return {
        "lat": float(result["lat"]),
        "lon": float(result["lon"]),
        "name": result.get("display_name", city).split(",")[0],
    }


def get_weather(city: str):
    # Step 1: Try OpenWeatherMap geocoding, then fall back to Nominatim
    location = _geocode_openweather(city) or _geocode_nominatim(city)

    if not location:
        raise CityNotFoundError(
            f"'{city}' not found. Try a nearby major city or check the spelling."
        )

    # Step 2: Fetch weather using resolved coordinates
    weather_params = {
        "lat": location["lat"],
        "lon": location["lon"],
        "appid": WEATHER_API_KEY,
        "units": "metric"
    }
    response = requests.get(WEATHER_URL, params=weather_params)

    if response.status_code != 200:
        raise CityNotFoundError("Weather service error. Please try again.")

    data = response.json()
    return {
        "city": location["name"],
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "condition": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"]
    }