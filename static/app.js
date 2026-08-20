/**
 * Skyline 2.0 — Weather & News Intelligence Hub
 * Main Client Application Logic
 */

// Global State
const state = {
  city: "London",
  units: "metric", // 'metric' (°C, m/s) or 'imperial' (°F, mph)
  category: "general",
  countryCode: "us",
  newsQuery: "",
  weatherData: null,
  newsData: [],
  favorites: [],
  activeMapLayer: "temp",
  map: null,
  mapMarker: null,
  weatherLayer: null,
  isSpeaking: false,
  speechSynth: window.speechSynthesis || null,
  currentUtterance: null,
  cityTimezoneOffset: 0
};

// OpenWeather Map API Key (for tile overlays)
const OWM_KEY = "3567269e5b1122923fb0361ac037930f";

// DOM Elements
const elements = {
  body: document.body,
  ambientGlow: document.getElementById("ambient-glow"),
  searchForm: document.getElementById("search-form"),
  cityInput: document.getElementById("city-input"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  geoBtn: document.getElementById("geo-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  voiceBtn: document.getElementById("voice-briefing-btn"),
  unitToggle: document.getElementById("unit-toggle"),
  unitButtons: document.querySelectorAll(".unit-btn"),
  popularChips: document.getElementById("popular-chips"),
  addFavoriteBtn: document.getElementById("add-favorite-btn"),
  favoriteStarIcon: document.getElementById("favorite-star-icon"),
  favoritesList: document.getElementById("favorites-list"),
  toast: document.getElementById("toast"),
  clockTime: document.getElementById("clock-time"),
  clockDate: document.getElementById("clock-date"),

  // Hero Card
  heroCityName: document.getElementById("hero-city-name"),
  heroCountryBadge: document.getElementById("hero-country-badge"),
  heroUpdateTime: document.getElementById("hero-update-time"),
  heroTemp: document.getElementById("hero-temp"),
  heroUnit: document.getElementById("hero-unit"),
  heroCondition: document.getElementById("hero-condition"),
  heroTempMax: document.getElementById("hero-temp-max"),
  heroTempMin: document.getElementById("hero-temp-min"),
  heroFeelsLike: document.getElementById("hero-feels-like"),
  heroWeatherImg: document.getElementById("hero-weather-img"),
  smartInsightText: document.getElementById("smart-insight-text"),
  outfitText: document.getElementById("outfit-text"),

  // Hourly & Daily
  hourlyTrack: document.getElementById("hourly-track"),
  dailyForecastList: document.getElementById("daily-forecast-list"),

  // Environmental Metrics
  valHumidity: document.getElementById("val-humidity"),
  barHumidity: document.getElementById("bar-humidity"),
  valDewPoint: document.getElementById("val-dew-point"),
  valWindSpeed: document.getElementById("val-wind-speed"),
  valWindGust: document.getElementById("val-wind-gust"),
  unitWind: document.getElementById("unit-wind"),
  windDirectionBadge: document.getElementById("wind-direction-badge"),
  compassArrow: document.getElementById("compass-arrow"),
  aqiPill: document.getElementById("aqi-pill"),
  valAqiLabel: document.getElementById("val-aqi-label"),
  valPm25: document.getElementById("val-pm25"),
  valPm10: document.getElementById("val-pm10"),
  valO3: document.getElementById("val-o3"),
  valAqiDesc: document.getElementById("val-aqi-desc"),
  valUv: document.getElementById("val-uv"),
  barUv: document.getElementById("bar-uv"),
  uvBadge: document.getElementById("uv-badge"),
  valUvDesc: document.getElementById("val-uv-desc"),
  valVisibility: document.getElementById("val-visibility"),
  unitVisibility: document.getElementById("unit-visibility"),
  valPressure: document.getElementById("val-pressure"),
  valClouds: document.getElementById("val-clouds"),
  valSunrise: document.getElementById("val-sunrise"),
  valSunset: document.getElementById("val-sunset"),
  sunArcBar: document.getElementById("sun-arc-bar"),
  daylightDuration: document.getElementById("daylight-duration"),

  // News
  newsCountrySelect: document.getElementById("news-country-select"),
  newsCategories: document.getElementById("news-categories"),
  newsSearchInput: document.getElementById("news-search-input"),
  newsSearchBtn: document.getElementById("news-search-btn"),
  newsStream: document.getElementById("news-stream"),
  newsSubtitle: document.getElementById("news-subtitle"),

  // Map Controls
  mapLayerButtons: document.querySelectorAll(".map-layer-btn")
};

/* ==========================================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadFavorites();
  initClock();
  initParticles();
  initMap();

  // Search Form Submit
  elements.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if (city) {
      state.city = city;
      loadDashboard();
    }
  });

  // Search Input Clear Button
  elements.cityInput.addEventListener("input", (e) => {
    elements.clearSearchBtn.style.display = e.target.value.length > 0 ? "block" : "none";
  });

  elements.clearSearchBtn.addEventListener("click", () => {
    elements.cityInput.value = "";
    elements.clearSearchBtn.style.display = "none";
    elements.cityInput.focus();
  });

  // GPS Geolocation Button
  elements.geoBtn.addEventListener("click", handleGeolocation);

  // Refresh Button
  elements.refreshBtn.addEventListener("click", () => {
    elements.refreshBtn.querySelector("i").classList.add("spin-anim");
    loadDashboard().finally(() => {
      setTimeout(() => {
        elements.refreshBtn.querySelector("i").classList.remove("spin-anim");
      }, 800);
    });
  });

  // Unit Toggle
  elements.unitButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedUnit = btn.getAttribute("data-unit");
      if (selectedUnit !== state.units) {
        state.units = selectedUnit;
        elements.unitButtons.forEach((b) => b.classList.toggle("active", b === btn));
        loadDashboard();
      }
    });
  });

  // Popular City Chips
  elements.popularChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      const city = chip.getAttribute("data-city");
      if (city) {
        state.city = city;
        elements.cityInput.value = city;
        elements.clearSearchBtn.style.display = "block";
        updateActiveChip(city);
        loadDashboard();
      }
    }
  });

  // Favorite Button
  elements.addFavoriteBtn.addEventListener("click", toggleFavoriteCity);

  // Audio Voice Daily Briefing
  elements.voiceBtn.addEventListener("click", handleVoiceBriefing);

  // News Category Pills
  elements.newsCategories.addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (pill) {
      const category = pill.getAttribute("data-category");
      state.category = category;
      document.querySelectorAll(".cat-pill").forEach((p) => p.classList.toggle("active", p === pill));
      loadNewsOnly();
    }
  });

  // News Country Select
  elements.newsCountrySelect.addEventListener("change", (e) => {
    state.countryCode = e.target.value;
    loadNewsOnly();
  });

  // News Search Filter
  elements.newsSearchBtn.addEventListener("click", handleNewsSearch);
  elements.newsSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNewsSearch();
    }
  });

  // Map Layer Buttons
  elements.mapLayerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer");
      state.activeMapLayer = layer;
      elements.mapLayerButtons.forEach((b) => b.classList.toggle("active", b === btn));
      updateMapWeatherLayer();
    });
  });

  // Initial Load
  loadDashboard();
});

/* ==========================================================================
   DASHBOARD DATA FETCHING & RENDERING
   ========================================================================== */

async function loadDashboard() {
  showSkeletons();
  updateFavoriteStar();

  try {
    const params = new URLSearchParams({
      city: state.city,
      units: state.units,
      category: state.category,
      country_code: state.countryCode
    });

    if (state.newsQuery) {
      params.append("q", state.newsQuery);
    }

    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Error fetching dashboard (Status ${res.status})`);
    }

    const data = await res.json();
    state.weatherData = data.weather;
    state.newsData = data.news || [];
    state.cityTimezoneOffset = data.weather.timezone_offset || 0;

    // Update active country in selector if inferred
    if (data.weather.country && elements.newsCountrySelect.querySelector(`option[value="${data.weather.country.toLowerCase()}"]`)) {
      state.countryCode = data.weather.country.toLowerCase();
      elements.newsCountrySelect.value = state.countryCode;
    }

    // Render Components
    renderHeroWeather(data.weather);
    renderHourlyForecast(data.weather.forecast?.hourly || []);
    renderDailyForecast(data.weather.forecast?.daily || []);
    renderEnvironmentalMatrix(data.weather);
    renderNews(state.newsData);
    applyAtmosphericTheme(data.weather);
    updateMapLocation(data.weather.coordinates, data.weather.city, data.weather.temperature);
    updateActiveChip(data.weather.city);

  } catch (err) {
    showToast(err.message, "error");
    elements.heroCondition.textContent = "Location not found";
    elements.smartInsightText.textContent = "Please check the spelling or search for a nearby city.";
    elements.newsStream.innerHTML = `<div class="news-article-card" style="justify-content:center; color:var(--text-muted);">Could not load data for "${state.city}".</div>`;
  }
}

async function loadNewsOnly() {
  elements.newsStream.innerHTML = renderNewsSkeletons();
  try {
    const params = new URLSearchParams({
      country_code: state.countryCode,
      category: state.category,
      page_size: "8"
    });
    if (state.newsQuery) {
      params.append("q", state.newsQuery);
    }

    const res = await fetch(`/api/news?${params.toString()}`);
    if (!res.ok) throw new Error("Could not refresh news");
    const articles = await res.json();
    state.newsData = articles;
    renderNews(articles);
  } catch (err) {
    elements.newsStream.innerHTML = `<div class="news-article-card" style="justify-content:center; color:var(--text-muted);">Could not load news headlines.</div>`;
  }
}

function handleNewsSearch() {
  const query = elements.newsSearchInput.value.trim();
  state.newsQuery = query;
  if (query) {
    elements.newsSubtitle.textContent = `Showing results for "${query}"`;
  } else {
    elements.newsSubtitle.textContent = "Curated live headlines";
  }
  loadNewsOnly();
}

/* ==========================================================================
   RENDERERS
   ========================================================================== */

function renderHeroWeather(weather) {
  elements.heroCityName.textContent = weather.city;
  elements.heroCountryBadge.textContent = weather.country || "GLOBAL";
  elements.heroTemp.textContent = Math.round(weather.temperature);
  elements.heroUnit.textContent = weather.units === "imperial" ? "°F" : "°C";
  elements.heroCondition.textContent = weather.condition;
  elements.heroTempMax.textContent = `${Math.round(weather.temp_max)}°`;
  elements.heroTempMin.textContent = `${Math.round(weather.temp_min)}°`;
  elements.heroFeelsLike.textContent = `${Math.round(weather.feels_like)}°`;

  // Icon
  const iconCode = weather.icon || "01d";
  elements.heroWeatherImg.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  elements.heroWeatherImg.alt = weather.condition;

  // Live timestamp
  const now = new Date();
  elements.heroUpdateTime.textContent = `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  // Smart AI Briefing
  if (weather.insights) {
    elements.smartInsightText.textContent = weather.insights.advice;
    elements.outfitText.textContent = weather.insights.recommended_outfit || "Casual comfort";
  }
}

function renderHourlyForecast(hourlyItems) {
  if (!hourlyItems || hourlyItems.length === 0) {
    elements.hourlyTrack.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Hourly forecast unavailable.</p>`;
    return;
  }

  elements.hourlyTrack.innerHTML = hourlyItems
    .map((item, idx) => {
      const isNow = idx === 0;
      return `
        <div class="hourly-card">
          <span class="hourly-time">${isNow ? "Now" : item.time}</span>
          <img class="hourly-icon" src="https://openweathermap.org/img/wn/${item.icon}.png" alt="${item.condition}" />
          <span class="hourly-temp">${item.temp}°</span>
          <span class="hourly-pop">
            <i class="fa-solid fa-droplet" style="font-size:0.65rem;"></i> ${item.pop}%
          </span>
        </div>
      `;
    })
    .join("");
}

function renderDailyForecast(dailyItems) {
  if (!dailyItems || dailyItems.length === 0) {
    elements.dailyForecastList.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Daily forecast unavailable.</p>`;
    return;
  }

  // Calculate global min and max for scaling the progress bar
  const allMins = dailyItems.map((d) => d.temp_min);
  const allMaxs = dailyItems.map((d) => d.temp_max);
  const minBound = Math.min(...allMins);
  const maxBound = Math.max(...allMaxs);
  const spread = Math.max(1, maxBound - minBound);

  elements.dailyForecastList.innerHTML = dailyItems
    .map((item, idx) => {
      const leftOffset = Math.round(((item.temp_min - minBound) / spread) * 100);
      const widthPct = Math.max(15, Math.round(((item.temp_max - item.temp_min) / spread) * 100));

      return `
        <div class="daily-row">
          <div class="daily-day-group">
            <span class="daily-day-name">${idx === 0 ? "Today" : item.day}</span>
            <span class="daily-date">${item.formatted_date}</span>
          </div>
          <div class="daily-condition-group">
            <img class="daily-icon" src="https://openweathermap.org/img/wn/${item.icon}.png" alt="${item.condition}" />
            <span class="daily-cond-text">${item.condition}</span>
          </div>
          <div class="daily-bar-container">
            <div class="daily-bar-track">
              <div class="daily-bar-fill" style="margin-left:${leftOffset}%; width:${widthPct}%;"></div>
            </div>
          </div>
          <div class="daily-temp-range">
            <span class="daily-min">${item.temp_min}°</span>
            <span class="daily-max">${item.temp_max}°</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEnvironmentalMatrix(weather) {
  const isMetric = weather.units === "metric";

  // 1. Humidity & Dew Point
  elements.valHumidity.textContent = weather.humidity;
  elements.barHumidity.style.width = `${Math.min(100, weather.humidity)}%`;
  elements.valDewPoint.textContent = `${weather.dew_point}°`;

  // 2. Wind & Compass
  elements.valWindSpeed.textContent = weather.wind_speed;
  elements.valWindGust.textContent = `${weather.wind_gust} ${isMetric ? "m/s" : "mph"}`;
  elements.unitWind.textContent = isMetric ? "m/s" : "mph";
  elements.windDirectionBadge.textContent = `${weather.wind_direction} (${weather.wind_deg}°)`;
  elements.compassArrow.style.transform = `rotate(${weather.wind_deg}deg)`;

  // 3. Air Quality
  const aqi = weather.air_quality || {};
  elements.aqiPill.textContent = `${aqi.label || "Good"} (${aqi.aqi || 1}/5)`;
  elements.aqiPill.style.color = aqi.color || "#10b981";
  elements.valAqiLabel.textContent = aqi.label || "Good";
  elements.valAqiDesc.textContent = aqi.description || "Air quality is fresh and safe.";
  if (aqi.components) {
    elements.valPm25.textContent = aqi.components.pm2_5 || "--";
    elements.valPm10.textContent = aqi.components.pm10 || "--";
    elements.valO3.textContent = aqi.components.o3 || "--";
  }

  // 4. UV Index
  // Estimate UV based on cloud cover and midday sun if API provides estimate
  const estimatedUv = Math.max(1, Math.round((1 - weather.clouds / 100) * 8 * 10) / 10);
  elements.valUv.textContent = estimatedUv;
  elements.barUv.style.width = `${Math.min(100, (estimatedUv / 11) * 100)}%`;
  if (estimatedUv < 3) {
    elements.uvBadge.textContent = "Low";
    elements.valUvDesc.textContent = "No special protection required.";
  } else if (estimatedUv < 6) {
    elements.uvBadge.textContent = "Moderate";
    elements.valUvDesc.textContent = "Wear sunglasses and sunscreen on bright days.";
  } else {
    elements.uvBadge.textContent = "High";
    elements.valUvDesc.textContent = "Protection required. Seek shade during midday.";
  }

  // 5. Visibility & Pressure
  elements.valVisibility.textContent = isMetric ? weather.visibility_km : weather.visibility_miles;
  elements.unitVisibility.textContent = isMetric ? "km" : "mi";
  elements.valPressure.textContent = weather.pressure;
  elements.valClouds.textContent = `${weather.clouds}%`;

  // 6. Sun Tracker
  if (weather.sunrise && weather.sunset) {
    const riseDate = new Date(weather.sunrise * 1000);
    const setDate = new Date(weather.sunset * 1000);
    elements.valSunrise.textContent = riseDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    elements.valSunset.textContent = setDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const totalDaylightSec = weather.sunset - weather.sunrise;
    const hours = Math.floor(totalDaylightSec / 3600);
    const mins = Math.floor((totalDaylightSec % 3600) / 60);
    elements.daylightDuration.textContent = `Total Daylight: ${hours}h ${mins}m`;

    const nowSec = Math.floor(Date.now() / 1000);
    const daylightElapsed = Math.max(0, Math.min(1, (nowSec - weather.sunrise) / totalDaylightSec));
    elements.sunArcBar.style.width = `${Math.round(daylightElapsed * 100)}%`;
  }
}

function renderNews(articles) {
  if (!articles || articles.length === 0) {
    elements.newsStream.innerHTML = `<div class="news-article-card" style="justify-content:center; color:var(--text-muted); padding:20px;">No articles found for this topic.</div>`;
    return;
  }

  elements.newsStream.innerHTML = articles
    .map(
      (a) => `
      <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="news-article-card">
        <div class="news-thumb-wrapper">
          <img src="${a.imageUrl}" alt="${a.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80'" />
        </div>
        <div class="news-article-body">
          <div>
            <div class="news-meta-row">
              <span class="news-source-tag">${a.source}</span>
              <span class="news-time-ago">${a.timeAgo}</span>
            </div>
            <h4 class="news-headline">${a.title}</h4>
            <p class="news-snippet">${a.description}</p>
          </div>
        </div>
      </a>
    `
    )
    .join("");
}

/* ==========================================================================
   ATMOSPHERIC THEMES & PARTICLE CANVAS
   ========================================================================== */

function applyAtmosphericTheme(weather) {
  const mainCond = (weather.main_condition || "").toLowerCase();
  const icon = weather.icon || "01d";
  const isNight = icon.includes("n");

  let themeClass = "theme-clear-day";

  if (isNight && (mainCond.includes("clear") || mainCond.includes("sky"))) {
    themeClass = "theme-clear-night";
  } else if (mainCond.includes("rain") || mainCond.includes("drizzle")) {
    themeClass = "theme-rain";
  } else if (mainCond.includes("thunder") || mainCond.includes("storm")) {
    themeClass = "theme-thunderstorm";
  } else if (mainCond.includes("snow") || mainCond.includes("sleet")) {
    themeClass = "theme-snow";
  } else if (mainCond.includes("cloud")) {
    themeClass = "theme-clouds";
  } else if (mainCond.includes("mist") || mainCond.includes("fog") || mainCond.includes("haze")) {
    themeClass = "theme-mist";
  }

  // Remove existing themes
  elements.body.className = themeClass;
}

function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = 45;
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.4,
    vy: Math.random() * 0.6 + 0.2,
    alpha: Math.random() * 0.4 + 0.1
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);

    const isRain = elements.body.classList.contains("theme-rain");
    const isSnow = elements.body.classList.contains("theme-snow");

    for (let p of particles) {
      p.x += isRain ? 0.8 : p.vx;
      p.y += isRain ? 8 : isSnow ? 1.2 : p.vy;

      if (p.y > height) {
        p.y = -10;
        p.x = Math.random() * width;
      }
      if (p.x > width) p.x = 0;
      if (p.x < 0) p.x = width;

      ctx.beginPath();
      if (isRain) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha * 1.5})`;
        ctx.lineWidth = 1.2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 1, p.y + 12);
        ctx.stroke();
      } else {
        ctx.fillStyle = isSnow ? `rgba(255, 255, 255, ${p.alpha * 1.8})` : `rgba(148, 163, 184, ${p.alpha})`;
        ctx.arc(p.x, p.y, isSnow ? p.radius * 1.4 : p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   INTERACTIVE RADAR MAP (LEAFLET)
   ========================================================================== */

function initMap() {
  const mapElem = document.getElementById("weather-map");
  if (!mapElem) return;

  // Initialize Leaflet Map
  state.map = L.map("weather-map", {
    center: [51.505, -0.09],
    zoom: 10,
    zoomControl: false,
    attributionControl: false
  });

  // Add zoom control top right
  L.control.zoom({ position: "topright" }).addTo(state.map);

  // Base Dark Tile Layer (CartoDB Dark Matter)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19
  }).addTo(state.map);

  updateMapWeatherLayer();
}

function updateMapLocation(coords, cityName, temp) {
  if (!state.map || !coords) return;

  state.map.setView([coords.lat, coords.lon], 10, { animate: true });

  if (state.mapMarker) {
    state.mapMarker.setLatLng([coords.lat, coords.lon]);
  } else {
    // Custom glowing pulsing marker
    const customIcon = L.divIcon({
      className: "custom-map-pin",
      html: `<div style="background:#38bdf8; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 14px #38bdf8;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    state.mapMarker = L.marker([coords.lat, coords.lon], { icon: customIcon }).addTo(state.map);
  }

  state.mapMarker.bindPopup(`<strong>${cityName}</strong><br/>${Math.round(temp)}°`).openPopup();
}

function updateMapWeatherLayer() {
  if (!state.map) return;

  if (state.weatherLayer) {
    state.map.removeLayer(state.weatherLayer);
  }

  let layerParam = "temp_new";
  if (state.activeMapLayer === "clouds") layerParam = "clouds_new";
  if (state.activeMapLayer === "precipitation") layerParam = "precipitation_new";

  state.weatherLayer = L.tileLayer(
    `https://tile.openweathermap.org/map/${layerParam}/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    { maxZoom: 18, opacity: 0.65 }
  ).addTo(state.map);
}

/* ==========================================================================
   SPEECH SYNTHESIS (AUDIO DAILY BRIEFING)
   ========================================================================== */

function handleVoiceBriefing() {
  if (!state.speechSynth) {
    showToast("Voice speech is not supported on this browser.", "error");
    return;
  }

  if (state.isSpeaking) {
    state.speechSynth.cancel();
    state.isSpeaking = false;
    elements.voiceBtn.classList.remove("playing");
    elements.voiceBtn.querySelector(".voice-btn-text").textContent = "Audio Brief";
    return;
  }

  if (!state.weatherData) {
    showToast("Weather data not ready.", "error");
    return;
  }

  const w = state.weatherData;
  const topHeadline = state.newsData[0]?.title || "Weather patterns remain active today.";

  const text = `Skyline daily briefing for ${w.city}. Currently ${w.condition} with a temperature of ${Math.round(
    w.temperature
  )} degrees ${w.units === "imperial" ? "Fahrenheit" : "Celsius"}. Feels like ${Math.round(
    w.feels_like
  )} degrees. ${w.insights?.advice || ""}. In global news: ${topHeadline}`;

  state.currentUtterance = new SpeechSynthesisUtterance(text);
  state.currentUtterance.rate = 1.0;
  state.currentUtterance.pitch = 1.0;

  state.currentUtterance.onstart = () => {
    state.isSpeaking = true;
    elements.voiceBtn.classList.add("playing");
    elements.voiceBtn.querySelector(".voice-btn-text").textContent = "Stop Brief";
  };

  state.currentUtterance.onend = () => {
    state.isSpeaking = false;
    elements.voiceBtn.classList.remove("playing");
    elements.voiceBtn.querySelector(".voice-btn-text").textContent = "Audio Brief";
  };

  state.currentUtterance.onerror = () => {
    state.isSpeaking = false;
    elements.voiceBtn.classList.remove("playing");
    elements.voiceBtn.querySelector(".voice-btn-text").textContent = "Audio Brief";
  };

  state.speechSynth.speak(state.currentUtterance);
}

/* ==========================================================================
   GPS GEOLOCATION
   ========================================================================== */

function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.", "error");
    return;
  }

  elements.geoBtn.querySelector("i").classList.add("spin-anim");
  showToast("Detecting your location via GPS...", "info");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      elements.geoBtn.querySelector("i").classList.remove("spin-anim");
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error("Could not resolve location coordinates");
        const data = await res.json();
        state.city = data.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        elements.cityInput.value = state.city;
        elements.clearSearchBtn.style.display = "block";
        showToast(`Located at ${state.city}! Loading weather...`, "success");
        loadDashboard();
      } catch (err) {
        showToast(err.message, "error");
      }
    },
    (err) => {
      elements.geoBtn.querySelector("i").classList.remove("spin-anim");
      showToast("Location access denied or unavailable.", "error");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/* ==========================================================================
   FAVORITES MANAGEMENT
   ========================================================================== */

function loadFavorites() {
  try {
    const saved = localStorage.getItem("skyline_favorites");
    state.favorites = saved ? JSON.parse(saved) : ["London", "New York", "Tokyo"];
    renderFavorites();
  } catch (e) {
    state.favorites = ["London", "New York", "Tokyo"];
  }
}

function saveFavorites() {
  localStorage.setItem("skyline_favorites", JSON.stringify(state.favorites));
  renderFavorites();
  updateFavoriteStar();
}

function toggleFavoriteCity() {
  const currentCity = state.weatherData?.city || state.city;
  const index = state.favorites.findIndex((c) => c.toLowerCase() === currentCity.toLowerCase());

  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast(`Removed "${currentCity}" from favorites.`);
  } else {
    state.favorites.push(currentCity);
    showToast(`Saved "${currentCity}" to favorites!`, "success");
  }

  saveFavorites();
}

function updateFavoriteStar() {
  const currentCity = state.weatherData?.city || state.city;
  const isFav = state.favorites.some((c) => c.toLowerCase() === currentCity.toLowerCase());
  elements.favoriteStarIcon.className = isFav ? "fa-solid fa-star" : "fa-regular fa-star";
  elements.addFavoriteBtn.style.color = isFav ? "#fbbf24" : "var(--text-secondary)";
}

function renderFavorites() {
  elements.favoritesList.innerHTML = state.favorites
    .map(
      (c) => `
      <div class="fav-pill" data-city="${c}">
        <span>${c}</span>
        <i class="fa-solid fa-xmark fav-delete" data-del-city="${c}" title="Remove"></i>
      </div>
    `
    )
    .join("");

  elements.favoritesList.querySelectorAll(".fav-pill").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      if (e.target.classList.contains("fav-delete")) {
        const toDel = e.target.getAttribute("data-del-city");
        state.favorites = state.favorites.filter((c) => c !== toDel);
        saveFavorites();
        return;
      }
      const city = pill.getAttribute("data-city");
      state.city = city;
      elements.cityInput.value = city;
      loadDashboard();
    });
  });
}

function updateActiveChip(cityName) {
  document.querySelectorAll("#popular-chips .chip").forEach((chip) => {
    const c = chip.getAttribute("data-city");
    chip.classList.toggle("active", c.toLowerCase() === cityName.toLowerCase());
  });
}

/* ==========================================================================
   LIVE CLOCK & TIMEZONE ADJUSTMENT
   ========================================================================== */

function initClock() {
  function tick() {
    const now = new Date();
    // Local target time adjusted by timezone offset
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const targetTime = new Date(utcTime + state.cityTimezoneOffset * 1000);

    elements.clockTime.textContent = targetTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    elements.clockDate.textContent = targetTime.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }

  tick();
  setInterval(tick, 1000);
}

/* ==========================================================================
   SKELETONS & NOTIFICATIONS
   ========================================================================== */

function showSkeletons() {
  elements.heroTemp.innerHTML = `<span class="skeleton" style="width:120px; height:80px; display:inline-block;"></span>`;
  elements.heroCondition.innerHTML = `<span class="skeleton" style="width:160px; height:24px; display:inline-block;"></span>`;
  elements.hourlyTrack.innerHTML = Array.from({ length: 7 })
    .map(() => `<div class="hourly-card"><span class="skeleton" style="width:100%; height:75px;"></span></div>`)
    .join("");
  elements.dailyForecastList.innerHTML = Array.from({ length: 4 })
    .map(() => `<div class="daily-row"><span class="skeleton" style="width:100%; height:32px;"></span></div>`)
    .join("");
}

function renderNewsSkeletons() {
  return Array.from({ length: 4 })
    .map(
      () => `
      <div class="news-article-card">
        <div class="news-thumb-wrapper skeleton"></div>
        <div class="news-article-body">
          <span class="skeleton" style="width:40%; height:12px; margin-bottom:8px;"></span>
          <span class="skeleton" style="width:90%; height:18px; margin-bottom:6px;"></span>
          <span class="skeleton" style="width:70%; height:14px;"></span>
        </div>
      </div>
    `
    )
    .join("");
}

function showToast(message, type = "info") {
  const toast = elements.toast;
  let icon = "fa-circle-info";
  if (type === "error") icon = "fa-triangle-exclamation";
  if (type === "success") icon = "fa-circle-check";

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3800);
}