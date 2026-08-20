import os
import time
import math
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
OWM_GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
OWM_REVERSE_GEO_URL = "https://api.openweathermap.org/geo/1.0/reverse"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
AIR_POLLUTION_URL = "https://api.openweathermap.org/data/2.5/air_pollution"

NOMINATIM_HEADERS = {
    "User-Agent": "SkylineWeatherHub/2.0 (personal project; contact: info@skyline.local)"
}

# In-memory TTL Cache
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 600  # 10 minutes


class CityNotFoundError(Exception):
    pass


def _get_from_cache(key: str) -> Optional[Any]:
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["timestamp"] < CACHE_TTL:
            return entry["data"]
        else:
            del _cache[key]
    return None


def _set_cache(key: str, data: Any) -> None:
    _cache[key] = {
        "timestamp": time.time(),
        "data": data
    }


def _deg_to_compass(degrees: float) -> str:
    val = int((degrees / 22.5) + 0.5)
    arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return arr[val % 16]


def _calculate_dew_point(temp_c: float, humidity: float) -> float:
    a = 17.27
    b = 237.7
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(max(humidity, 1) / 100.0)
    return round((b * alpha) / (a - alpha), 1)


def _generate_smart_insights(current: Dict[str, Any], forecast_items: list) -> Dict[str, Any]:
    temp = current.get("temperature", 20)
    condition = (current.get("condition") or "").lower()
    humidity = current.get("humidity", 50)
    wind_speed = current.get("wind_speed", 0)
    
    # Check if rain is expected in next 24h
    rain_expected = any(
        "rain" in item.get("condition", "").lower() or item.get("pop", 0) > 0.35
        for item in forecast_items[:8]
    )

    tips = []
    outfit = ""
    activity_score = 85  # out of 100

    if rain_expected or "rain" in condition or "drizzle" in condition:
        tips.append("🌧️ Rain expected today. Don't forget an umbrella or waterproof jacket.")
        outfit = "Waterproof jacket & umbrella"
        activity_score -= 25
    elif "snow" in condition:
        tips.append("❄️ Snowfall alert! Wear insulated thermal layers and slip-resistant boots.")
        outfit = "Heavy coat, scarf & winter boots"
        activity_score -= 30
    elif temp > 30:
        tips.append("☀️ High heat index! Stay hydrated, wear light cottons, and apply SPF 30+.")
        outfit = "Light breathable clothes & sunglasses"
        activity_score -= 10
    elif temp < 10:
        tips.append("🧥 Chilly weather. A warm jacket or sweater is recommended.")
        outfit = "Warm sweater & jacket"
    else:
        tips.append("✨ Pleasant weather outdoors! Great day for walks, cycling, or patio dining.")
        outfit = "Casual comfortable attire"

    if wind_speed > 10:
        tips.append(f"💨 Gusty winds ({wind_speed} m/s). Secure loose outdoor items.")
        activity_score -= 15

    if humidity > 80 and temp > 22:
        tips.append("💧 High humidity may make the air feel heavier. Keep drinking water.")

    return {
        "advice": tips[0] if tips else "Enjoy your day!",
        "tips": tips,
        "recommended_outfit": outfit,
        "activity_score": max(20, min(100, activity_score))
    }


def geocode_city(city: str) -> Optional[Dict[str, Any]]:
    cache_key = f"geo_{city.lower().strip()}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    # 1. OpenWeather geocoding
    if WEATHER_API_KEY:
        try:
            params = {"q": city, "limit": 1, "appid": WEATHER_API_KEY}
            res = requests.get(OWM_GEO_URL, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data:
                    item = data[0]
                    result = {
                        "lat": item["lat"],
                        "lon": item["lon"],
                        "name": item.get("name", city),
                        "country": item.get("country", ""),
                        "state": item.get("state", "")
                    }
                    _set_cache(cache_key, result)
                    return result
        except Exception:
            pass

    # 2. Fallback to OpenStreetMap Nominatim
    try:
        params = {"q": city, "format": "json", "limit": 1, "addressdetails": 1}
        res = requests.get(NOMINATIM_URL, params=params, headers=NOMINATIM_HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json()
            if data:
                item = data[0]
                addr = item.get("address", {})
                result = {
                    "lat": float(item["lat"]),
                    "lon": float(item["lon"]),
                    "name": addr.get("city") or addr.get("town") or addr.get("village") or item.get("display_name", city).split(",")[0],
                    "country": addr.get("country_code", "").upper(),
                    "state": addr.get("state", "")
                }
                _set_cache(cache_key, result)
                return result
    except Exception:
        pass

    return None


def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    cache_key = f"rev_{round(lat, 3)}_{round(lon, 3)}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    name = "Current Location"
    country = "US"

    # OpenWeather Reverse
    if WEATHER_API_KEY:
        try:
            params = {"lat": lat, "lon": lon, "limit": 1, "appid": WEATHER_API_KEY}
            res = requests.get(OWM_REVERSE_GEO_URL, params=params, timeout=5)
            if res.status_code == 200 and res.json():
                item = res.json()[0]
                result = {
                    "lat": lat,
                    "lon": lon,
                    "name": item.get("name", name),
                    "country": item.get("country", country),
                    "state": item.get("state", "")
                }
                _set_cache(cache_key, result)
                return result
        except Exception:
            pass

    # Nominatim Reverse fallback
    try:
        params = {"lat": lat, "lon": lon, "format": "json"}
        res = requests.get(NOMINATIM_REVERSE_URL, params=params, headers=NOMINATIM_HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json()
            addr = data.get("address", {})
            result = {
                "lat": lat,
                "lon": lon,
                "name": addr.get("city") or addr.get("town") or addr.get("village") or "Current Location",
                "country": addr.get("country_code", "US").upper(),
                "state": addr.get("state", "")
            }
            _set_cache(cache_key, result)
            return result
    except Exception:
        pass

    return {"lat": lat, "lon": lon, "name": name, "country": country}


def get_air_quality(lat: float, lon: float) -> Dict[str, Any]:
    cache_key = f"aqi_{round(lat, 3)}_{round(lon, 3)}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    aqi_descriptions = {
        1: {"label": "Good", "color": "#10b981", "desc": "Air quality is ideal for outdoor activities."},
        2: {"label": "Fair", "color": "#84cc16", "desc": "Air quality is acceptable for most people."},
        3: {"label": "Moderate", "color": "#f59e0b", "desc": "Sensitive individuals may experience minor symptoms."},
        4: {"label": "Poor", "color": "#f97316", "desc": "Health alert: vulnerable groups may experience effects."},
        5: {"label": "Very Poor", "color": "#ef4444", "desc": "Health warning of emergency conditions."}
    }

    fallback_data = {
        "aqi": 1,
        "label": "Good",
        "color": "#10b981",
        "description": "Air quality is fresh and clean.",
        "components": {"pm2_5": 8.4, "pm10": 14.2, "co": 210.0, "no2": 15.0, "o3": 45.0, "so2": 4.0}
    }

    if not WEATHER_API_KEY:
        return fallback_data

    try:
        params = {"lat": lat, "lon": lon, "appid": WEATHER_API_KEY}
        res = requests.get(AIR_POLLUTION_URL, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("list"):
                item = data["list"][0]
                aqi_val = item["main"]["aqi"]
                meta = aqi_descriptions.get(aqi_val, aqi_descriptions[1])
                components = item.get("components", {})
                result = {
                    "aqi": aqi_val,
                    "label": meta["label"],
                    "color": meta["color"],
                    "description": meta["desc"],
                    "components": {
                        "pm2_5": round(components.get("pm2_5", 0), 1),
                        "pm10": round(components.get("pm10", 0), 1),
                        "co": round(components.get("co", 0), 1),
                        "no2": round(components.get("no2", 0), 1),
                        "o3": round(components.get("o3", 0), 1),
                        "so2": round(components.get("so2", 0), 1)
                    }
                }
                _set_cache(cache_key, result)
                return result
    except Exception:
        pass

    return fallback_data


def get_forecast(lat: float, lon: float, units: str = "metric") -> Dict[str, Any]:
    cache_key = f"forecast_{round(lat, 3)}_{round(lon, 3)}_{units}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    if not WEATHER_API_KEY:
        return {"hourly": [], "daily": []}

    try:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": WEATHER_API_KEY,
            "units": units
        }
        res = requests.get(FORECAST_URL, params=params, timeout=6)
        if res.status_code != 200:
            return {"hourly": [], "daily": []}

        data = res.json()
        raw_list = data.get("list", [])

        # Hourly items (next 24 hours: 8 points)
        hourly = []
        for item in raw_list[:9]:
            dt_txt = item.get("dt_txt", "")
            time_part = dt_txt.split(" ")[1][:5] if " " in dt_txt else ""
            hourly.append({
                "dt": item["dt"],
                "time": time_part,
                "temp": round(item["main"]["temp"]),
                "feels_like": round(item["main"]["feels_like"]),
                "condition": item["weather"][0]["description"].title(),
                "main": item["weather"][0]["main"],
                "icon": item["weather"][0]["icon"],
                "pop": round(item.get("pop", 0) * 100),  # precipitation probability %
                "wind_speed": round(item["wind"]["speed"], 1),
                "humidity": item["main"]["humidity"]
            })

        # Aggregate 5-Day daily summary
        daily_map: Dict[str, Dict[str, Any]] = {}
        for item in raw_list:
            dt_txt = item.get("dt_txt", "")
            date_key = dt_txt.split(" ")[0] if " " in dt_txt else str(item["dt"])

            temp = item["main"]["temp"]
            condition = item["weather"][0]["description"].title()
            icon = item["weather"][0]["icon"]
            pop = item.get("pop", 0)

            if date_key not in daily_map:
                # Parse timestamp for day name
                struct_time = time.gmtime(item["dt"])
                day_name = time.strftime("%a", struct_time)
                date_formatted = time.strftime("%b %d", struct_time)

                daily_map[date_key] = {
                    "date": date_key,
                    "day": day_name,
                    "formatted_date": date_formatted,
                    "temp_min": temp,
                    "temp_max": temp,
                    "conditions": [condition],
                    "icons": [icon],
                    "pop_max": pop
                }
            else:
                entry = daily_map[date_key]
                entry["temp_min"] = min(entry["temp_min"], temp)
                entry["temp_max"] = max(entry["temp_max"], temp)
                entry["conditions"].append(condition)
                entry["icons"].append(icon)
                entry["pop_max"] = max(entry["pop_max"], pop)

        daily = []
        for date_key, entry in list(daily_map.items())[:5]:
            # Pick midday icon or most frequent icon
            mid_idx = len(entry["icons"]) // 2
            chosen_icon = entry["icons"][mid_idx] if entry["icons"] else "01d"
            chosen_condition = entry["conditions"][mid_idx] if entry["conditions"] else "Clear"

            daily.append({
                "date": entry["date"],
                "day": entry["day"],
                "formatted_date": entry["formatted_date"],
                "temp_min": round(entry["temp_min"]),
                "temp_max": round(entry["temp_max"]),
                "condition": chosen_condition,
                "icon": chosen_icon,
                "pop": round(entry["pop_max"] * 100)
            })

        result = {"hourly": hourly, "daily": daily}
        _set_cache(cache_key, result)
        return result

    except Exception:
        return {"hourly": [], "daily": []}


def get_weather(city: str, units: str = "metric") -> Dict[str, Any]:
    cache_key = f"full_weather_{city.lower().strip()}_{units}"
    cached = _get_from_cache(cache_key)
    if cached:
        return cached

    # Step 1: Geocode city to coordinates
    location = geocode_city(city)
    if not location:
        raise CityNotFoundError(
            f"Location '{city}' could not be resolved. Please verify the city name."
        )

    lat = location["lat"]
    lon = location["lon"]

    # Step 2: Fetch Current Weather
    weather_params = {
        "lat": lat,
        "lon": lon,
        "appid": WEATHER_API_KEY,
        "units": units
    }
    response = requests.get(WEATHER_URL, params=weather_params, timeout=6)
    if response.status_code != 200:
        raise CityNotFoundError("Weather service error. Please try again.")

    data = response.json()
    main = data.get("main", {})
    wind = data.get("wind", {})
    sys = data.get("sys", {})
    weather_desc = data.get("weather", [{}])[0]

    temp = main.get("temp", 0)
    feels_like = main.get("feels_like", 0)
    temp_min = main.get("temp_min", temp)
    temp_max = main.get("temp_max", temp)
    humidity = main.get("humidity", 0)
    pressure = main.get("pressure", 1013)
    visibility = data.get("visibility", 10000)  # in meters
    clouds = data.get("clouds", {}).get("all", 0)
    wind_deg = wind.get("deg", 0)
    wind_speed = wind.get("speed", 0)
    wind_gust = wind.get("gust", wind_speed)

    dew_point = _calculate_dew_point(temp if units == "metric" else (temp - 32) * 5 / 9, humidity)
    if units == "imperial":
        dew_point = round(dew_point * 9 / 5 + 32, 1)

    sunrise = sys.get("sunrise", 0)
    sunset = sys.get("sunset", 0)
    timezone_offset = data.get("timezone", 0)

    # Step 3: Fetch Forecast & Air Quality
    forecast_data = get_forecast(lat, lon, units)
    air_quality = get_air_quality(lat, lon)

    # Step 4: Generate Smart AI Tips
    insights = _generate_smart_insights({
        "temperature": temp if units == "metric" else (temp - 32) * 5 / 9,
        "condition": weather_desc.get("description", ""),
        "humidity": humidity,
        "wind_speed": wind_speed
    }, forecast_data.get("hourly", []))

    country_code = location.get("country") or sys.get("country", "")

    result = {
        "city": location["name"],
        "state": location.get("state", ""),
        "country": country_code,
        "coordinates": {"lat": lat, "lon": lon},
        "temperature": round(temp, 1),
        "feels_like": round(feels_like, 1),
        "temp_min": round(temp_min, 1),
        "temp_max": round(temp_max, 1),
        "condition": weather_desc.get("description", "Unknown").title(),
        "main_condition": weather_desc.get("main", "Clear"),
        "icon": weather_desc.get("icon", "01d"),
        "humidity": humidity,
        "pressure": pressure,
        "dew_point": dew_point,
        "visibility_km": round(visibility / 1000, 1),
        "visibility_miles": round(visibility / 1609.34, 1),
        "clouds": clouds,
        "wind_speed": round(wind_speed, 1),
        "wind_gust": round(wind_gust, 1),
        "wind_deg": wind_deg,
        "wind_direction": _deg_to_compass(wind_deg),
        "sunrise": sunrise,
        "sunset": sunset,
        "timezone_offset": timezone_offset,
        "units": units,
        "air_quality": air_quality,
        "forecast": forecast_data,
        "insights": insights
    }

    _set_cache(cache_key, result)
    return result