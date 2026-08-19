import requests
import os

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


class CityNotFoundError(Exception):
    pass


def get_weather(city: str):
    # Step 1: Geocode the city/village name into coordinates
    geo_params = {
        "q": city,
        "limit": 1,
        "appid": WEATHER_API_KEY
    }
    geo_response = requests.get(GEO_URL, params=geo_params)

    if geo_response.status_code != 200:
        raise CityNotFoundError("Location service error. Please try again.")

    geo_data = geo_response.json()

    if not geo_data:
        raise CityNotFoundError(
            f"'{city}' not found. Try a nearby major city or check the spelling."
        )

    location = geo_data[0]
    lat = location["lat"]
    lon = location["lon"]
    resolved_name = location.get("name", city)

    # Step 2: Fetch weather using coordinates (works for villages too)
    weather_params = {
        "lat": lat,
        "lon": lon,
        "appid": WEATHER_API_KEY,
        "units": "metric"
    }
    response = requests.get(WEATHER_URL, params=weather_params)

    if response.status_code != 200:
        raise CityNotFoundError("Weather service error. Please try again.")

    data = response.json()
    return {
        "city": resolved_name,
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "condition": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"]
    }