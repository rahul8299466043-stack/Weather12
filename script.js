
const $ = (id) => document.getElementById(id);

let fahrenheit = false;
let latest = null;

const conditions = {
  0: ["Clear sky", "☀️", "sunny"],
  1: ["Mainly clear", "🌤️", "sunny"],
  2: ["Partly cloudy", "⛅", "cloudy"],
  3: ["Overcast", "☁️", "cloudy"],
  45: ["Foggy", "🌫️", "cloudy"],
  48: ["Foggy", "🌫️", "cloudy"],
  51: ["Light drizzle", "🌦️", "rainy"],
  53: ["Drizzle", "🌦️", "rainy"],
  55: ["Heavy drizzle", "🌧️", "rainy"],
  61: ["Light rain", "🌦️", "rainy"],
  63: ["Rain", "🌧️", "rainy"],
  65: ["Heavy rain", "🌧️", "rainy"],
  71: ["Light snow", "🌨️", "snowy"],
  73: ["Snow", "❄️", "snowy"],
  75: ["Heavy snow", "❄️", "snowy"],
  80: ["Rain showers", "🌦️", "rainy"],
  81: ["Rain showers", "🌧️", "rainy"],
  82: ["Heavy showers", "⛈️", "rainy"],
  95: ["Thunderstorm", "⛈️", "rainy"],
  96: ["Thunderstorm", "⛈️", "rainy"],
  99: ["Thunderstorm", "⛈️", "rainy"]
};

function getCondition(code) {
  return conditions[code] || ["Cloudy", "☁️", "cloudy"];
}

function showTemp(value) {
  const result = fahrenheit ? value * 9 / 5 + 32 : value;
  return Math.round(result) + "°";
}

function showTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setStatus(message, error = false) {
  $("status").textContent = message;
  $("status").style.color = error ? "#ffb3a7" : "#aebbd6";
}

async function searchCity(name) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(name) + "&count=1&language=en&format=json";

  const response = await fetch(url);
  if (!response.ok) throw new Error("City search failed.");

  const data = await response.json();
  if (!data.results || !data.results.length) {
    throw new Error("City not found. Please try another name.");
  }

  return data.results[0];
}

async function loadWeather(cityName) {
  if (!cityName.trim()) {
    setStatus("Please enter a city name.", true);
    return;
  }

  setStatus("Getting the latest weather...");

  try {
    const place = await searchCity(cityName);

    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      timezone: "auto",
      forecast_days: "5"
    });

    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?" + params
    );

    if (!response.ok) throw new Error("Weather service is unavailable.");

    const data = await response.json();

    latest = { place, data };
    renderWeather();
    $("cityInput").value = place.name;

    setStatus(
      "Weather updated · " + place.name +
      (place.country ? ", " + place.country : "") +
      " · Data by Open-Meteo"
    );
  } catch (error) {
    setStatus(error.message || "Something went wrong.", true);
  }
}

function renderWeather() {
  if (!latest) return;

  const { place, data } = latest;
  const c = data.current;
  const d = data.daily;
  const info = getCondition(c.weather_code);

  $("city").textContent =
    place.name + (place.country_code ? ", " + place.country_code : "");

  $("date").textContent = new Date(c.time).toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  $("temp").textContent = Math.round(
    fahrenheit ? c.temperature_2m * 9 / 5 + 32 : c.temperature_2m
  );
  $("unit").textContent = fahrenheit ? "°F" : "°C";

  $("condition").textContent = info[0];
  $("weatherIcon").textContent = info[1];
  $("feels").textContent = "Feels like " + showTemp(c.apparent_temperature);
  $("highlow").textContent =
    showTemp(d.temperature_2m_max[0]) + " / " +
    showTemp(d.temperature_2m_min[0]);

  $("humidity").textContent = c.relative_humidity_2m + "%";
  $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";

  $("scene").className = "scene " + info[2];
  $("sceneText").textContent = info[0];

  const t = c.temperature_2m;
  const h = c.relative_humidity_2m;
  let feeling = t >= 35
    ? "It feels hot outside."
    : t >= 27
      ? "It feels warm outside."
      : t >= 17
        ? "The temperature feels mild."
        : "It feels cool outside.";

  let humidityText = h >= 70
    ? "Humidity is high."
    : h <= 30
      ? "The air is quite dry."
      : "Humidity is moderate.";

  $("description").textContent =
    info[0] + ". " + feeling + " " + humidityText +
    " Wind speed is " + Math.round(c.wind_speed_10m) + " km/h.";

  $("sunrise").textContent = showTime(d.sunrise[0]);
  $("sunset").textContent = showTime(d.sunset[0]);

  $("forecastList").innerHTML = d.time.map((day, i) => {
    const forecastCondition = getCondition(d.weather_code[i]);
    const dayName = i === 0
      ? "Today"
      : new Date(day + "T12:00:00").toLocaleDateString(
          [], { weekday: "long" }
        );

    const date = new Date(day + "T12:00:00").toLocaleDateString(
      [], { day: "numeric", month: "short" }
    );

    return `
      <div class="forecast-day">
        <div>
          <strong>${dayName}</strong>
          <small>${date}</small>
        </div>
        <div class="forecast-icon">${forecastCondition[1]}</div>
        <div class="forecast-temps">
          ${showTemp(d.temperature_2m_max[i])}
          <span>${showTemp(d.temperature_2m_min[i])}</span>
        </div>
      </div>`;
  }).join("");
}

$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  loadWeather($("cityInput").value);
});

$("unitBtn").addEventListener("click", () => {
  fahrenheit = !fahrenheit;
  $("unitBtn").textContent = fahrenheit ? "°F / °C" : "°C / °F";
  renderWeather();
});

loadWeather("Jaipur");
