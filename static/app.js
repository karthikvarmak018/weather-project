const API_BASE = "http://127.0.0.1:8000"; // change this if your FastAPI runs elsewhere

const weatherCard = document.getElementById("weather-card");
const newsList = document.getElementById("news-list");
const cityForm = document.getElementById("city-form");
const cityInput = document.getElementById("city-input");

async function loadDashboard(city) {
  weatherCard.innerHTML = `<p class="loading">Loading weather…</p>`;
  newsList.innerHTML = `<li class="loading">Loading news…</li>`;

  try {
    const res = await fetch(`${API_BASE}/dashboard?city=${encodeURIComponent(city)}`);

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    const data = await res.json();
    renderWeather(data.weather);
    renderNews(data.news);
  } catch (err) {
    weatherCard.innerHTML = `<p class="error">Couldn't load weather: ${err.message}</p>`;
    newsList.innerHTML = `<li class="error">Couldn't load news.</li>`;
  }
}

function renderWeather(weather) {
  weatherCard.innerHTML = `
    <p class="city-name">${weather.city}</p>
    <div class="temp-row">
      <span class="temp">${Math.round(weather.temperature)}°</span>
      <span class="condition">${weather.condition}</span>
    </div>
    <div class="details">
      <span>Feels like ${Math.round(weather.feels_like)}°</span>
      <span>Humidity ${weather.humidity}%</span>
      <span>Wind ${weather.wind_speed} m/s</span>
    </div>
  `;
}

function renderNews(newsItems) {
  if (!newsItems || newsItems.length === 0) {
    newsList.innerHTML = `<li class="loading">No headlines found.</li>`;
    return;
  }

  newsList.innerHTML = newsItems
    .map(
      (item) => `
      <li>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a>
        <span class="source">${item.source}</span>
      </li>
    `
    )
    .join("");
}

cityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    loadDashboard(city);
  }
});

// Initial load
loadDashboard(cityInput.value.trim() || "London");