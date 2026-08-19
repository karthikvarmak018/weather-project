const API_BASE = "https://weather-project-rcda.onrender.com"; // change this if your FastAPI runs elsewhere

const weatherCard = document.getElementById("weather-card");
const newsList = document.getElementById("news-list");
const cityForm = document.getElementById("city-form");
const cityInput = document.getElementById("city-input");

function showSkeletons() {
  weatherCard.innerHTML = `
    <span class="skeleton skeleton-line" style="width:30%"></span>
    <span class="skeleton skeleton-temp"></span>
    <div style="display:flex; gap:24px; margin-top:16px;">
      <span class="skeleton skeleton-row"></span>
      <span class="skeleton skeleton-row"></span>
      <span class="skeleton skeleton-row"></span>
    </div>
  `;
  newsList.innerHTML = Array.from({ length: 4 })
    .map(() => `<li style="border:none;"><span class="skeleton skeleton-news-item"></span></li>`)
    .join("");
}

async function loadDashboard(city) {
  showSkeletons();

  try {
    const res = await fetch(`${API_BASE}/dashboard?city=${encodeURIComponent(city)}`);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }

    const data = await res.json();
    renderWeather(data.weather);
    renderNews(data.news);
  } catch (err) {
    weatherCard.innerHTML = `<p class="error">${err.message}</p>`;
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