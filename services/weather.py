import requests
import os

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

class CityNotFoundError(Exception):
    pass

def get_weather(city: str):
    params = {
        "q": city,
        "appid": WEATHER_API_KEY,
        "units": "metric"
    }
    response = requests.get(BASE_URL, params=params)

    if response.status_code == 404:
        raise CityNotFoundError(f"'{city}' not found. Try a nearby major city or check the spelling.")

    if response.status_code != 200:
        raise CityNotFoundError("Weather service error. Please try again.")

    data = response.json()
    return {
        "city": data["name"],
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "condition": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"]
    }