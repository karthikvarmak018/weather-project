# 🌤️ Skyline — Weather & News Intelligence Hub

A modern, full-stack weather forecasting, atmospheric analytics, and real-time global news platform built with **FastAPI** and modern **Vanilla JavaScript / CSS**.

---

## ✨ Features

- 🌡️ **Real-Time Weather Metrics**: Temperature, "feels like", humidity, wind speed, atmospheric pressure, visibility, and UV index.
- 📅 **5-Day Weather Forecast**: Detailed multi-day trend analysis with daily high/low cards and visual conditions.
- 💨 **Air Quality Index (AQI)**: Breakdown of pollutant levels including PM2.5, PM10, NO2, SO2, CO, and Ozone with health impact indicators.
- 📰 **Contextual Global News**: Real-time curated news headlines filtered by country or category (General, Tech, Business, Science, Health, Sports, Entertainment).
- 📍 **Geolocation & Instant Search**: Auto-detect user location or search across any city globally with unit switching (°C / °F).
- 🎨 **Dynamic Glassmorphism UI**: Ambient reactive backgrounds, smooth micro-animations, and responsive layout for desktop and mobile.

---

## 🚀 Tech Stack

- **Backend**: Python 3.10+, [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), Requests, Python-Dotenv
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism design system), Modern JavaScript (ES6+)
- **APIs**:
  - [OpenWeatherMap API](https://openweathermap.org/api) (Current Weather, 5-Day Forecast, Air Quality)
  - [NewsAPI](https://newsapi.org/) (Real-time Top Headlines)

---

## 📦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/karthikvarmak018/weather-project.git
cd weather-project
```

### 2. Create and Activate a Virtual Environment (Optional but Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env
```

Add your API keys inside `.env`:

```env
WEATHER_API_KEY=your_openweathermap_api_key_here
NEWS_API_KEY=your_newsapi_org_key_here
```

> **Note**: 
> - Get a free Weather API key from [OpenWeatherMap](https://openweathermap.org/api).
> - Get a free News API key from [NewsAPI.org](https://newsapi.org/).

### 5. Run the Application

```bash
python -m uvicorn main:app --reload
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

## 📁 Project Structure

```
weather-project/
├── main.py              # FastAPI server & route definitions
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # Project documentation
├── services/
│   ├── weather.py       # OpenWeatherMap API service integrations
│   └── news.py          # NewsAPI service integrations
└── static/
    ├── index.html       # Main Single Page Application layout
    ├── style.css        # Glassmorphism UI styling & animations
    └── app.js           # Frontend logic, charts & state handling
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
