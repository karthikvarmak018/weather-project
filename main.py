from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from services.weather import get_weather
from services.news import get_news

load_dotenv()

app = FastAPI(title="Weather & News Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Welcome to the Weather & News Dashboard API"}

@app.get("/dashboard")
def dashboard(city: str, country_code: str = "us"):
    weather = get_weather(city)
    news = get_news(country_code)
    
    return {
        "weather": weather,
        "news": news
    }

app.mount("/static", StaticFiles(directory="static", html=True), name="static")