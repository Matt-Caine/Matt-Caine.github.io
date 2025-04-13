let gamePaused = false;
let gameStartTime = null;
let lastPrices = {};
let pendingTrade = null;
let marketViewMode = "all";
let systems = {};
let player = {
  location: "Sol",
  credits: 10000,
  fuel: 500,
  inventory: {},
  vault: {},
  shipments: [],
};

const recentPlayerBuys = {}; // Format: { "Sol-Iron": timestamp }
const TRADE_COOLDOWN = 10000; // 10 seconds cooldown to prevent resell exploits



let corporations = {};
window.activeContracts = [];
const UNIT = "ᵣ";
let expandedResources = {};
const npcLastTradeTime = {};

const RESOURCE_TYPES = [
  "Iron",
  "Helium",
  "Gold",
  "Water",
  "Uranium",
  "Copper",
  "Silicon",
  "Titanium",
  "Hydrogen",
  "Carbon",
  "Platinum",
  "Nickel",
  "Oxygen",
  "Neon",
  "Cobalt",
  "Lithium",
  "Iridium",
  "Fuel",
];

const RESOURCE_DATA = {
  Iron: {
    base: 45,          // Abundant structural metal
    volatility: 0.01,
  },
  Helium: {
    base: 22,          // Inert gas, lightweight transport cost
    volatility: 0.04,
  },
  Gold: {
    base: 950,         // High value, low market flux
    volatility: 0.01,
  },
  Water: {
    base: 60,          // Scarce and essential off-Earth
    volatility: 0.03,
  },
  Uranium: {
    base: 1200,        // Rare, regulated, high-value
    volatility: 0.02,
  },
  Copper: {
    base: 80,          // Used in electronics, moderate value
    volatility: 0.02,
  },
  Silicon: {
    base: 65,          // Semiconductor basis, moderate use
    volatility: 0.025,
  },
  Titanium: {
    base: 300,         // Strong alloy metal
    volatility: 0.02,
  },
  Hydrogen: {
    base: 35,          // Fuel-grade gas
    volatility: 0.05,
  },
  Carbon: {
    base: 28,          // Versatile industrial use
    volatility: 0.03,
  },
  Platinum: {
    base: 850,         // Precious catalyst metal
    volatility: 0.015,
  },
  Nickel: {
    base: 55,          // Industrial metal
    volatility: 0.02,
  },
  Oxygen: {
    base: 75,          // Life support, very valuable in space
    volatility: 0.035,
  },
  Neon: {
    base: 18,          // Rare noble gas
    volatility: 0.05,
  },
  Cobalt: {
    base: 120,         // High-tech material
    volatility: 0.035,
  },
  Lithium: {
    base: 140,         // Battery essential, volatile demand
    volatility: 0.05,
  },
  Iridium: {
    base: 1100,        // Very rare, top-tier catalyst
    volatility: 0.015,
  },
  Fuel: {
    base: 90,          // Critical to operations, regulated
    volatility: 0.03,
  },
};


const SYSTEM_NAMES = [
  // Real systems
  "Sol",
  "Alpha Centauri",
  "Proxima Centauri",
  "Barnard's Star",
  "Sirius",
  "Vega",
  "Tau Ceti",
  "Epsilon Eridani",
  "TRAPPIST-1e",
  "Kepler-452b",
  "Luyten's Star",
  "Gliese 581",
  "Wolf 359",
  "Ross 128",
  "Beta Pictoris",
];

const FUEL_CAPACITY = 500;
const TRAVEL_FUEL_COST = 0;
const npcCorporations = [
  "ÆTHRΛ GROUP",
  "Aegis Starfreight Inc.",
  "Astrometallix Limited",
  "Beacon Shipping Group",
  "Bluecap Resources",
  "Borealis Extraction Co.",
  "Centauri Supply Corp.",
  "CHΛOS CIRCUIT INC.",
  "Cryllion Rift Haulers",
  "CRYSTALEX LOGISTIX",
  "CRYOTRΛDΞ SYNDICΛTΞ",
  "DΛRKMΛTTΞR Inc.",
  "DeepVoid Logistics",
  "DeltaEdge Holdings",
  "DYNΞRA CORE",
  "ExoPath Commodities",
  "GΛLΛXCORΞ",
  "Helion Industries",
  "Horizon Materials",
  "IONCORΞ SYSTΞMS",
  "K'thari Holdings",
  "ΛSTOMINΞR Co.",
  "MANER Co.",
  "Martech Mining Group",
  "NΞBULΛX",
  "New Dawn Trading Co.",
  "Nova Terra Ventures",
  "NOVAΦORGE Consortium",
  "NOVΛFRONTIΞR",
  "OBSIDIΛN HOLDINGS",
  "ΩMEGA SPAN",
  "Orion Exports",
  "Orion Pacific Freight",
  "ORI EXPORTS",
  "Pioneer Logistics",
  "POLΛRΞX TRΛDΞ NETWORK",
  "Qorr-Varn Logistics",
  "QUΛNTUM HΛRVΞSTΞRS",
  "Redline Haulers Inc.",
  "RΞDSHIFT UNLIMITΞD",
  "Skarnet Shipping Guild",
  "SINGULON INDUSTRIES",
  "SPΛCΞY",
  "Stellar Freightworks",
  "SYNTΞX DYNAMICS",
  "T'rannex BioExtraction",
  "TΞLLURIC HOLDINGS",
  "Thorne & Vale Shipping",
  "Titan Reach Holdings",
  "TRIX HΞΛVY INDUSTRIΞS",
  "Trident Interstellar",
  "Union Stellar Freight",
  "Unity Star Logistics",
  "VORTΞX NEΞTWORK",
  "VOIDΞL",
  "XΞNOFRΞIGHT",
  "Xephari Trade Complex",
  "ZΞNITH ORBITΛLS",
  "Zorl'Nex Syndicate",
];

function getTimeSeededPrice(system, resource) {
  const time = new Date();
  const minute = Math.floor(time.getUTCSeconds() / 10);
  const hour = time.getUTCHours();
  const day = time.getUTCDate();
  const month = time.getUTCMonth();
  // Fixed time seed (per minute, UTC-based)
  const seed = [system, resource, day, month, hour, minute].join("-");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  const { base, volatility } = RESOURCE_DATA[resource];
  const variation = (Math.sin(hash) + 1) / 2; // 0–1
  let offset = (variation - 0.5) * volatility * base * 10;
  // Replace Math.random() with deterministic event simulation
  const spikeChance = (hash % 1000) / 1000;
  if (spikeChance > 0.98) {
    // spike
    const spikeMultiplier = 1 + ((hash >> 5) % 200) / 100; // 1.00x to 3.00x
    offset += base * spikeMultiplier;
  } else if (spikeChance < 0.02) {
    // crash
    const dropMultiplier = 1 + ((hash >> 3) % 150) / 100; // 1.00x to 2.50x
    offset -= base * dropMultiplier;
  }
  // 📊 Count global availability
  let availableCount = 0;
  let totalSystems = SYSTEM_NAMES.length;
  for (let sys of SYSTEM_NAMES) {
    const marketEntry = systems[sys]?.market?.[resource];
    if (marketEntry) availableCount++;
  }
  // 📉 If it's rare, apply scarcity boost (0–30%)
  let scarcityMultiplier =
    1 + ((totalSystems - availableCount) / totalSystems) * 0.3;
  const rawPrice = (base + offset) * scarcityMultiplier;
  const clamped = Math.max(base * 0.5, Math.min(base * 3, rawPrice));
  return parseFloat(clamped.toFixed(2));
}

function populateCustomDropdown(listId, items, onClickHandler) {
  const list = document.getElementById(listId);
  list.innerHTML = ""; // Clear existing items
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.textContent = item;
    li.onclick = () => onClickHandler(item);
    list.appendChild(li);
  });
}

function filterList(inputId, listId) {
  const input = document.getElementById(inputId).value.toLowerCase();
  const listItems = document.getElementById(listId).getElementsByTagName("li");
  for (let item of listItems) {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(input) ? "" : "none";
  }
}

function showDropdown(listId) {
  // Hide all dropdowns first
  document.querySelectorAll(".custom-dropdown").forEach((dropdown) => {
    dropdown.classList.add("d-none");
  });
  // Show the targeted one
  const list = document.getElementById(listId);
  if (list) list.classList.remove("d-none");
}

function hideDropdown(listId) {
  document.getElementById(listId).classList.add("d-none");
}

function calculateInitialTrends() {
  const savedPriceData = JSON.parse(
    localStorage.getItem("atlasPriceHistory") || "{}"
  );
  SYSTEM_NAMES.forEach((system) => {
    RESOURCE_TYPES.forEach((res) => {
      const key = `${system}-${res}`;
      const currentPrice = getTimeSeededPrice(system, res);
      const previousPrice = savedPriceData[key];
      let trend = "same";
      if (previousPrice !== undefined) {
        if (currentPrice > previousPrice) trend = "up";
        else if (currentPrice < previousPrice) trend = "down";
      }
      // Save trend info
      lastPrices[key] = {
        price: currentPrice,
        trend,
        timestamp: Date.now(),
      };
      // Set system prices for rendering
      if (!systems[system])
        systems[system] = {
          name: system,
          prices: {},
        };
      systems[system].prices[res] = currentPrice;
      // Save current price for future comparisons
      savedPriceData[key] = currentPrice;
    });
  });
  // Save snapshot so next refresh works too
  localStorage.setItem("atlasPriceHistory", JSON.stringify(savedPriceData));
}

function formatPrice(num) {
  return parseFloat(num).toFixed(2);
}

function getBuySellPrice(basePrice) {
  const spread = basePrice * 0.03; // 3% spread
  return {
    buyPrice: parseFloat((basePrice + spread).toFixed(2)),
    sellPrice: parseFloat((basePrice - spread).toFixed(2)),
  };
}

function showTradeSummary(type, res, amt, price) {
  const total = price * amt;
  // 🔥 Just auto-run the trade and log it
  if (pendingTrade) {
    pendingTrade();
    pendingTrade = null;
    // Optional: log summary instantly
    const action = type === "buy" ? "Purchased" : "Sold";
  }
}

function getRandomCorporation() {
  return npcCorporations[Math.floor(Math.random() * npcCorporations.length)];
}

function updateBuyBreakdown() {
  const res = document.getElementById("buyResourceSelect").value;
  const amt = parseInt(document.getElementById("buyAmount").value);
  const div = document.getElementById("buyBreakdown");
  const buyBtn = document.querySelector("button.btn-success");

  const marketAvailable = systems[player.location]?.market?.[res];
  if (!res || isNaN(amt) || amt <= 0 || !marketAvailable) {
    div.innerHTML = !marketAvailable
      ? "<span class='text-danger'> N/A</span>"
      : "";
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.innerText = !marketAvailable ? "Unavailable" : "Buy";
    }
    return;
  }

  const price = systems[player.location]?.prices?.[res] ?? 0;
  const total = amt * price;

  if (buyBtn) {
    if (player.credits < total) {
      buyBtn.disabled = true;
      buyBtn.innerText = "Insufficient Credits";
    } else {
      buyBtn.disabled = false;
      buyBtn.innerText = "Buy";
    }
  }

  div.innerHTML = `<span style="color: #ff6666"> -${total.toFixed(2)}ᶜ</span>`;
}

function updateSellBreakdown() {
  const res = document.getElementById("sellResourceSelect").value;
  const amt = parseInt(document.getElementById("sellAmount").value);
  const div = document.getElementById("sellBreakdown");

  const lastBuyTime = recentPlayerBuys[`${player.location}-${res}`];
  if (lastBuyTime && Date.now() - lastBuyTime < TRADE_COOLDOWN) {
    sellBtn.disabled = true;
    sellBtn.innerText = "Cooldown Active";
  }

  if (!res || isNaN(amt) || amt <= 0) {
    div.innerHTML = "";
    return;
  }

  const price = systems[player.location]?.prices?.[res] ?? 0;
  const total = amt * price;

  div.innerHTML = `<span style="color: #66ff66"> +${total.toFixed(2)}ᶜ</span>`;
}

function getRandomShipmentDelay() {
  const min = 3000; // 3 seconds
  const max = 300000; // 10 minutes
  const skewed = Math.pow(Math.random(), 2); // Squared = bias toward 0
  return Math.floor(skewed * (max - min) + min);
}

npcCorporations.forEach((name) => {
  corporations[name] = {
    name,
    credits: 1000,
    inventory: {},
    location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
    destination: null,
    warpETA: null,
    shipments: [],
  };
  npcLastTradeTime[name] = Date.now();
  RESOURCE_TYPES.forEach((res) => {
    corporations[name].inventory[res] = [];
    // Give them some starting inventory
    if (Math.random() < 0.5) {
      const qty = Math.floor(Math.random() * 100) + 20;
      const price = RESOURCE_DATA[res].base;
      corporations[name].inventory[res].push([qty, price]);
    }
  });
});
RESOURCE_TYPES.forEach((res) => (player.inventory[res] = []));
let sortState = {
  column: null,
  ascending: true,
};

function initGame() {
  loadGameState();
  toggleTravelButton();

  // Set default amounts
  document.getElementById("buyAmount").value = 1;
  document.getElementById("sellAmount").value = 1;

  // Set default selected resource
  const firstRes = RESOURCE_TYPES[0];
  document.getElementById("buyResourceSelect").value = firstRes;
  document.getElementById("sellResourceSelect").value = firstRes;

  // Attach event listeners
  document
    .getElementById("buyResourceSelect")
    .addEventListener("change", updateBuyBreakdown);
  document
    .getElementById("buyAmount")
    .addEventListener("input", updateBuyBreakdown);
  document
    .getElementById("sellResourceSelect")
    .addEventListener("change", updateSellBreakdown);
  document
    .getElementById("sellAmount")
    .addEventListener("input", updateSellBreakdown);
  document
    .getElementById("toggleMarketView")
    .addEventListener("click", toggleMarketView);

  ["buyAmount", "sellAmount"].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      if (input.value.length > 6) {
        input.value = input.value.slice(0, 6); // limit to 6 digits
      }
    });
  });

  // Show initial breakdowns on load

  // Ensure inventory and vault arrays exist
  RESOURCE_TYPES.forEach((res) => {
    if (!Array.isArray(player.inventory[res])) player.inventory[res] = [];
    if (!Array.isArray(player.vault?.[res])) player.vault[res] = [];
  });

  // Rebuild systems and markets
  const availabilityCache =
    JSON.parse(localStorage.getItem("atlasMarketAvailability")) || {};
  const marketDataCache =
    JSON.parse(localStorage.getItem("atlasMarketData")) || {};
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  SYSTEM_NAMES.forEach((name) => {
    systems[name] = {
      name,
      prices: {},
      market: {},
    };

    systems[name].tariffs = {
      importTaxRate: Math.random() * 0.05,  // 0–5% import tax
      exportTaxRate: Math.random() * 0.05,  // 0–5% export tax
    };

    RESOURCE_TYPES.forEach((res) => {
      const key = `${name}-${res}`;
      let isAvailable = true;
      let supply = null;
      let demand = null;

      // Load availability from cache
      if (
        availabilityCache[key] &&
        now - availabilityCache[key].timestamp < oneHour
      ) {
        isAvailable = availabilityCache[key].available;
      } else {
        isAvailable = Math.random() < 0.85;
        availabilityCache[key] = {
          available: isAvailable,
          timestamp: now,
        };
      }

      // Load market data from cache or generate new
      if (marketDataCache[key]) {
        supply = marketDataCache[key].supply;
        demand = marketDataCache[key].demand;
      } else {
        const basePrice = RESOURCE_DATA[res].base;
        const t = Math.min(1, Math.max(0, (basePrice - 10) / 500));
        const base = 800 * (1 - t) + 100 * t + Math.random() * 200;
        supply = base + Math.random() * 30 - 15;
        demand = base + Math.random() * 30 - 15;
        if (Math.random() < 0.03) supply *= 1 + Math.random() * 1.5;
        if (Math.random() > 0.97) demand *= 1 + Math.random() * 1.5;
        supply = Math.max(10, Math.floor(supply));
        demand = Math.max(10, Math.floor(demand));
        marketDataCache[key] = { supply, demand };
      }

      systems[name].market[res] = isAvailable ? { supply, demand } : null;
    });
  });

  // Save cache
  localStorage.setItem(
    "atlasMarketAvailability",
    JSON.stringify(availabilityCache)
  );
  localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));

  // Initialize UI
  calculateInitialTrends();
  populateSelectors();
  processAndRenderShipments();
  updateBuyBreakdown();
  updateSellBreakdown();
  updateUI();
}

function renderTaxSidebar() {
  const tbody = document.getElementById("taxSidebarBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  SYSTEM_NAMES.forEach((name) => {
    const { importTaxRate, exportTaxRate } = systems[name]?.tariffs || {
      importTaxRate: 0,
      exportTaxRate: 0,
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${name}</td>
      <td class="text-info">${(importTaxRate * 100).toFixed(1)}</td>
      <td class="text-danger">${(exportTaxRate * 100).toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });
}


function updateGameAgeDisplay() {
  const el = document.getElementById("gameAge");
  if (!el || !gameStartTime) return;
  const elapsed = Date.now() - gameStartTime;
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / 1000 / 60) % 60);
  const hours = Math.floor(elapsed / 1000 / 60 / 60);
  el.textContent = `Runtime: ${hours}h ${minutes}m ${seconds}s`;
}

function saveGameState(logToConsole = false) {
  const state = {
    credits: player.credits,
    fuel: player.fuel,
    inventory: player.inventory,
    vault: player.vault,
    shipments: player.shipments,
    location: player.location,
    corporations: corporations,
    createdAt: gameStartTime || Date.now(), // 🕒 Save the timestamp
  };
  localStorage.setItem("atlasSave", JSON.stringify(state));
  if (logToConsole) log("Network Synced.");
  // ⏰ Show save timestamp on UI
  const saveEl = document.getElementById("saveStatus");
  if (saveEl) {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");
    saveEl.textContent = `Last Saved: ${hh}:${mm}:${ss}`;
  }
}

function loadGameState() {
  const saved = localStorage.getItem("atlasSave");
  // fallback
  // Always initialize player inventory
  player.inventory = {};
  RESOURCE_TYPES.forEach((res) => (player.inventory[res] = []));
  // Initialize corporations in case there is no save
  corporations = {};
  if (!saved) {
    gameStartTime = Date.now();
    player.vault = {}; // 🟢 ADD THIS LINE
    RESOURCE_TYPES.forEach((res) => (player.vault[res] = []));
    npcCorporations.forEach((name) => {
      corporations[name] = {
        name,
        credits: 1000,
        inventory: {},
        location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
        destination: null,
        eta: 0,
        shipments: [],
      };
      // 🛠️ Fix for missing `.shipments` from older saves
      if (!Array.isArray(corporations[name].shipments)) {
        corporations[name].shipments = [];
      }
      if (!corporations[name].inventory) {
        corporations[name].inventory = {};
      }
      RESOURCE_TYPES.forEach((res) => {
        if (!Array.isArray(corporations[name].inventory[res])) {
          corporations[name].inventory[res] = [];
        }
      });
    });
    return;
  }
  try {
    const state = JSON.parse(saved);
    gameStartTime = state.createdAt || Date.now();
    player.credits = state.credits ?? 1000;
    player.fuel = state.fuel ?? 100;
    player.location = state.location ?? "Sol";
    player.shipments = state.shipments ?? [];
    // Fix shipment times
    player.shipments.forEach((s) => {
      s.time = parseInt(s.time);
    });
    // Restore vault
    RESOURCE_TYPES.forEach((res) => {
      const savedVault = state.vault?.[res];
      if (Array.isArray(savedVault)) {
        player.vault[res] = savedVault;
      } else {
        player.vault[res] = [];
      }
    });
    // Restore inventory
    RESOURCE_TYPES.forEach((res) => {
      const loaded = state.inventory?.[res];
      if (Array.isArray(loaded)) {
        player.inventory[res] = loaded;
      }
    });
    const savedCorps = state.corporations || {};
    npcCorporations.forEach((name) => {
      corporations[name] = savedCorps[name] || {
        name,
        credits: 1000,
        inventory: {},
        location: SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)],
        destination: null,
        eta: 0,
        shipments: [],
      };
      if (!Array.isArray(corporations[name].shipments)) {
        corporations[name].shipments = [];
      }
      if (!corporations[name].inventory) {
        corporations[name].inventory = {};
      }
      RESOURCE_TYPES.forEach((res) => {
        if (!Array.isArray(corporations[name].inventory[res])) {
          corporations[name].inventory[res] = [];
        }
      });
    });
  } catch (e) {
    console.error("Failed to load save:", e);
  }
}

function resetGameState() {
  if (
    !confirm("Are you sure you want to reset your save? This cannot be undone.")
  )
    return;
  localStorage.removeItem("atlasSave");
  localStorage.removeItem("atlasPriceHistory");
  localStorage.removeItem("atlasMarketData"); // ⬅ add this!
  localStorage.removeItem("atlasMarketAvailability"); // ⬅ and this!
  location.reload();
}

function populateSelectors() {
  const travelSelect = document.getElementById("travelSearch");
  travelSelect.addEventListener("change", toggleTravelButton);

  const buySelect = document.getElementById("buyResourceSelect");
  const sellSelect = document.getElementById("sellResourceSelect");

  if (travelSelect) {
    travelSelect.innerHTML = "";
    SYSTEM_NAMES.forEach((system) => {
      const opt = document.createElement("option");
      opt.value = system;
      opt.textContent = system;
      travelSelect.appendChild(opt);
    });
    travelSelect.value = player.location; // Default to current location
  }

  if (buySelect && sellSelect) {
    RESOURCE_TYPES.forEach((res) => {
      const optBuy = document.createElement("option");
      optBuy.value = res;
      optBuy.textContent = res;
      buySelect.appendChild(optBuy);

      const optSell = document.createElement("option");
      optSell.value = res;
      optSell.textContent = res;
      sellSelect.appendChild(optSell);
    });
  }
}

function updateMarket() {
  const savedPriceData = JSON.parse(
    localStorage.getItem("atlasPriceHistory") || "{}"
  );
  SYSTEM_NAMES.forEach((system) => {
    RESOURCE_TYPES.forEach((res) => {
      const key = `${system}-${res}`;
      const oldPrice =
        systems[system].prices[res] ?? getTimeSeededPrice(system, res);
      const newPrice = getTimeSeededPrice(system, res);
      if (newPrice > oldPrice) trend = "up";
      else if (newPrice < oldPrice) trend = "down";
      // 🔥 Only update the trend if price changed
      lastPrices[key] = {
        price: newPrice,
        trend,
        timestamp: Date.now(),
      };
      systems[system].prices[res] = newPrice;
      savedPriceData[key] = newPrice;
    });
  });
  // 🧠 Log best arbitrage tip only once per market refresh
  let bestResource = null;
  let bestProfit = 0;
  let bestLow = 0;
  let bestHigh = 0;
  RESOURCE_TYPES.forEach((res) => {
    const prices = SYSTEM_NAMES.map((system) => systems[system].prices[res]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const profit = max - min;
    if (profit > bestProfit) {
      bestProfit = profit;
      bestResource = res;
      bestLow = min;
      bestHigh = max;
    }
  });
  if (bestProfit > 0) {
    logMarket(
      `Anonymous tip: Buy  ${bestResource}  at <span class="text-success">${bestLow.toFixed(
        2
      )}ᶜ</span>, sell at <span class="text-danger">${bestHigh.toFixed(
        2
      )}ᶜ</span>. Potential profit: <span class="text-warning">+${(
        bestHigh - bestLow
      ).toFixed(2)}ᶜ</span>`
    );
  }
  updateNewsTicker();
  updateBuyBreakdown();
  updateSellBreakdown();
  localStorage.setItem("atlasPriceHistory", JSON.stringify(savedPriceData));
  updateUI();
}

function toggleTravelButton() {
  const btn = document.getElementById("travelButton");
  const selected = document.getElementById("travelSearch").value;

  if (selected === player.location) {
    btn.disabled = true;
    btn.innerText = "N/A";
  } else if (player.fuel < TRAVEL_FUEL_COST) {
    btn.disabled = true;
    btn.innerText = "Insufficient Fuel";
  } else {
    btn.disabled = false;
    btn.innerText = "Warp";
  }
}

function logMarket(msg) {
  const logDiv = document.getElementById("marketLog");
  if (!logDiv) {
    console.warn("marketLog element not found");
    return;
  }

  const entry = document.createElement("div");
  entry.className = "console-entry";

  const time = document.createElement("span");
  time.className = "console-timestamp";
  time.textContent = `[${new Date().toLocaleTimeString()}]`;

  const content = document.createElement("span");
  content.innerHTML = " " + msg; // Use innerHTML to render tags

  entry.appendChild(time);
  entry.appendChild(content);
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function simulateNpcBehavior() {
  Object.values(corporations).forEach((corp) => {
    // Complete warp if time is up
    if (corp.warpETA && Date.now() >= corp.warpETA) {
      corp.location = corp.destination;
      corp.destination = null;
      corp.warpETA = null;
    }

    // If traveling, skip
    if (corp.warpETA) return;

    // Give NPCs a higher chance to act
    const shouldTrade = Math.random() < 0.7;
    const shouldTravel = !shouldTrade && Math.random() < 0.5;

    // Trade if possible
    if (shouldTrade) {
      for (let i = 0; i < 2; i++) {
        simulateNpcTradeAtLocation(corp); // Double trade chance per call
      }
    }

    // Travel to a new system occasionally
    if (shouldTravel) {
      let newDest;
      for (let attempts = 0; attempts < 3; attempts++) {
        newDest = SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)];
        if (newDest !== corp.location) break;
      }
      corp.destination = newDest;
      corp.warpETA = Date.now() + Math.floor(Math.random() * 5000) + 3000;
    }
  });
}


function simulateNpcTradeAtLocation(corp) {
  const system = corp.location;
  const tariffs = systems[system]?.tariffs || { importTaxRate: 0, exportTaxRate: 0 };
  const res = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];

  const market = systems[system]?.market?.[res];
  const price = systems[system].prices[res];
  const base = RESOURCE_DATA[res].base;
  if (!market || !price) return;

  const type = Math.random() > 0.5 ? "buy" : "sell";
  const amount = Math.floor(Math.random() * 200) + 50;

  if (type === "buy") {
    const importTax = price * amount * tariffs.importTaxRate;
    const totalCost = price * amount + importTax;

    if (corp.credits >= totalCost) {
      corp.credits -= totalCost;
      market.demand += amount;

      const delay = getRandomShipmentDelay();
      corp.shipments.push({
        resource: res,
        amount,
        price,
        time: Date.now() + delay,
      });

      logMarket(
        `<span class="text-warning">${corp.name}</span> purchased ${amount}${UNIT} of ${res} in ${system} |
        <span class="text-info">${price.toFixed(2)}ᶜ</span> each
        (Import Tax: <span class="text-danger">${importTax.toFixed(2)}ᶜ</span>,
        Total Cost: <span class="text-success">${totalCost.toFixed(2)}ᶜ</span>)`
      );
    }
  } else {
    const inventory = corp.inventory[res];
    const totalQty = inventory.reduce((sum, [qty]) => sum + qty, 0);
    const sellAmt = Math.min(totalQty, amount);

    if (sellAmt > 0) {
      let toSell = sellAmt;
      let totalPaid = 0;
      let sold = 0;

      for (let i = 0; i < inventory.length && toSell > 0; i++) {
        let [qty, buyPrice] = inventory[i];
        const sellingQty = Math.min(qty, toSell);
        totalPaid += sellingQty * buyPrice;
        inventory[i][0] -= sellingQty;
        toSell -= sellingQty;
        sold += sellingQty;
      }
      corp.inventory[res] = inventory.filter(([q]) => q > 0);

      const totalRevenue = sold * price;
      const exportTax = totalRevenue * tariffs.exportTaxRate;
      const afterTaxRevenue = totalRevenue - exportTax;
      const profitOrLoss = afterTaxRevenue - totalPaid;

      const profitColor = profitOrLoss >= 0 ? "text-success" : "text-danger";
      const profitLabel = profitOrLoss >= 0 ? "Profit" : "Loss";

      // Allow selling at a loss 30% of the time
      if (profitOrLoss >= 0 || Math.random() < 0.4) {
        corp.credits += afterTaxRevenue;
        market.supply += sold;

        logMarket(
          `<span class="text-warning">${corp.name}</span> sold ${sold}${UNIT} of ${res} in ${system} |
          <span class="text-info">${price.toFixed(2)}ᶜ</span> each 
          (Export Tax: <span class="text-danger">${exportTax.toFixed(2)}ᶜ</span>,
          <span class="${profitColor}">${profitLabel}: ${profitOrLoss.toFixed(2)}ᶜ</span>)`
        );
      } else {
        // Restore inventory if refusing loss
        inventory.push([sold, totalPaid / sold]);
      }
    }
  }

  const ratio = market.demand / market.supply;
  let newPrice =
    price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
  newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
  systems[system].prices[res] = parseFloat(newPrice.toFixed(2));

  flashMarketCell(system, res);
  setTimeout(updateUI, 300);
}



function sellAllOfResource(resource) {
  const inv = player.inventory[resource];
  if (!inv || inv.length === 0) return log(`No ${resource} to sell.`);

  let soldQty = 0;
  let totalPaid = 0;
  inv.forEach(([qty, price]) => {
    soldQty += qty;
    totalPaid += qty * price;
  });

  let price = systems[player.location]?.prices[resource];
  let market = systems[player.location]?.market?.[resource];

  // 🆕 If market is missing, create it
  if (!market) {
    log(`ΛΞ started trade of ${res} in ${player.location}.`);
    const base = RESOURCE_DATA[resource].base;
    price = base * 1.25;
    if (!systems[player.location].market) systems[player.location].market = {};
    if (!systems[player.location].prices) systems[player.location].prices = {};
    market = { supply: 0, demand: 0 };
    systems[player.location].market[resource] = market;
    systems[player.location].prices[resource] = price;

    // 🧠 Save new market data
    const key = `${player.location}-${resource}`;
    const now = Date.now();
    const availabilityCache = JSON.parse(
      localStorage.getItem("atlasMarketAvailability") || "{}"
    );
    availabilityCache[key] = { available: true, timestamp: now };
    localStorage.setItem(
      "atlasMarketAvailability",
      JSON.stringify(availabilityCache)
    );

    const marketDataCache = JSON.parse(
      localStorage.getItem("atlasMarketData") || "{}"
    );
    marketDataCache[key] = { supply: 0, demand: 0 };
    localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));
  }

  const revenue = soldQty * price;
  const profit = revenue - totalPaid;
  const profitColor = profit >= 0 ? "text-success" : "text-danger";
  const profitLabel = profit >= 0 ? "Profit" : "Loss";

  player.credits += revenue;
  player.inventory[resource] = [];
  market.supply += soldQty;

  flash("credits");
  log(
    `Sold ${soldQty}${UNIT} of ${resource} at ${price.toFixed(
      2
    )}ᶜ each (Total: ${revenue.toFixed(2)}ᶜ)`
  );

  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold  ${soldQty}${UNIT} of ${resource}  |  <span class="text-info">${price.toFixed(
      2
    )}ᶜ</span> each (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(
      2
    )}ᶜ</span>)`
  );
  updateUI();
}

function sellAllMaterials() {
  let totalRevenue = 0;
  let soldItems = [];
  for (let resource in player.inventory) {
    const batches = player.inventory[resource];
    let quantity = 0;
    batches.forEach(([qty]) => (quantity += qty));
    const price = systems[player.location]?.prices[resource] || 0;
    if (quantity > 0 && price > 0) {
      const revenue = quantity * price;
      totalRevenue += revenue;
      soldItems.push(`${quantity} ${resource}  |  ᶜ${price.toFixed(2)}`);
      player.inventory[resource] = []; // Clear inventory for that resource
      // 🧾 Add NPC-style market log per resource
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold  ${quantity}${UNIT} of ${resource} in  ${
          player.location
        }   |  <span class="text-info">${price.toFixed(
          2
        )}ᶜ</span> each (Total Cost: <span class="text-success">${revenue.toFixed(
          2
        )}ᶜ</span>)`
      );
    }
  }
  if (totalRevenue > 0) {
    player.credits += totalRevenue;
    log(
      `Sold all materials for ᶜ${totalRevenue.toFixed(2)}: ${soldItems.join(
        ", "
      )}`
    );
    updateUI(); // Update tables, credits, inventory panel, etc.
  } else {
    log("No materials to sell.");
    const consoleDiv = document.getElementById("console");
    if (!consoleDiv) {
      console.warn("Console element not found.");
      return;
    }
  }
}

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 500);
}

function log(msg) {
  const consoleDiv = document.getElementById("console");
  const entry = document.createElement("div");
  entry.className = "console-entry";
  const time = document.createElement("span");
  time.className = "console-timestamp";
  time.textContent = `[${new Date().toLocaleTimeString()}]`;
  const content = document.createElement("span");
  if (msg.startsWith("Refueled")) content.style.color = "#ffffff";
  else if (msg.startsWith("Sold")) content.style.color = "#ffffff";
  else if (msg.startsWith("SHIP")) content.style.color = "#ffffff";
  else if (msg.endsWith("y.")) content.style.color = "#ffffff";
  else if (msg.startsWith("Not enough")) content.style.color = "#ff4444";
  else if (msg.startsWith("Network")) content.style.color = "#ffa500";
  else content.style.color = "#ffffff";
  content.textContent = msg;
  entry.appendChild(time);
  entry.appendChild(content);
  consoleDiv.appendChild(entry);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

function calculateInventoryValue(inventory) {
  let total = 0;
  for (const res in inventory) {
    const batches = inventory[res];
    const price =
      systems[player.location]?.prices?.[res] || RESOURCE_DATA[res]?.base || 0;
    for (const [qty] of batches) {
      total += qty * price;
    }
  }
  return total;
}

function getTopTrade(inventory) {
  let topRes = "—";
  let maxQty = 0;
  for (const res in inventory) {
    const total = inventory[res].reduce((sum, [qty]) => sum + qty, 0);
    if (total > maxQty) {
      maxQty = total;
      topRes = res;
    }
  }
  return maxQty > 0 ? topRes : "—";
}

function getLastTradeTime(corp) {
  if (!corp.shipments || corp.shipments.length === 0) return "—";
  const latest = Math.max(...corp.shipments.map((s) => s.time || 0));
  const secondsAgo = Math.floor((Date.now() - latest) / 1000);
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  return `${Math.floor(secondsAgo / 3600)}h ago`;
}

let lastRanks = {}; // Keep outside the function

function updateLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  if (!tbody) return;
  tbody.innerHTML = ""; // Clear existing rows

  const leaderboard = [
    {
      name: "ΛTLΛS | ΞQUINOX™",
      netWorth: player.credits + calculateInventoryValue(player.inventory),
      credits: player.credits,
      inventoryValue: calculateInventoryValue(player.inventory),
      topTrade: getTopTrade(player.inventory),
      tradeCount: player.shipments?.length || 0,
      lastTrade: getLastTradeTime(player),
      location: player.location,
      inTransit: "No",
    },
    ...Object.values(corporations).map((corp) => {
      const inventoryValue = calculateInventoryValue(corp.inventory);
      const netWorth = corp.credits + inventoryValue;
      return {
        name: corp.name,
        netWorth,
        credits: corp.credits,
        inventoryValue,
        topTrade: getTopTrade(corp.inventory),
        tradeCount: corp.shipments?.length || 0,
        lastTrade: getLastTradeTime(corp),
        location: corp.location,
        inTransit: corp.destination ? "Yes" : "No",
      };
    }),
  ].sort((a, b) => b.netWorth - a.netWorth);

  leaderboard.forEach((corp, i) => {
    const tr = document.createElement("tr");

    // Highlight player row
    if (corp.name === "ΛTLΛS | ΞQUINOX™") {
      tr.classList.add("player-row");
    }

    tr.innerHTML = `
			<td>${i + 1}</td>
			<td>${corp.name}</td>
			<td>${corp.netWorth.toFixed(2)}ᶜ</td>
			<td>${corp.credits.toFixed(2)}</td>
			<td>${corp.inventoryValue.toFixed(2)}</td>
		`;

    tbody.appendChild(tr);
  });
}

// Modal handlers
document.getElementById("openLeaderboardBtn").addEventListener("click", () => {
  updateLeaderboard();
  document.getElementById("leaderboardModal").style.display = "block";
});
document.getElementById("closeLeaderboardBtn").addEventListener("click", () => {
  document.getElementById("leaderboardModal").style.display = "none";
});
window.addEventListener("click", (e) => {
  const modal = document.getElementById("leaderboardModal");
  if (e.target == modal) {
    modal.style.display = "none";
  }
});

function updateRefuelButton() {
  const refuelBtn = document.getElementById("refuelButton");
  const fuelPrice = systems[player.location]?.prices?.Fuel ?? 10;
  const needed = FUEL_CAPACITY - player.fuel;
  const canAfford = Math.min(needed, Math.floor(player.credits / fuelPrice));

  if (player.fuel >= FUEL_CAPACITY) {
    refuelBtn.disabled = true;
    refuelBtn.innerText = "Max Fuel";
  } else if (canAfford === 0) {
    refuelBtn.disabled = true;
    refuelBtn.innerText = "Insufficient Credits";
  } else {
    refuelBtn.disabled = false;
    refuelBtn.innerText = `Refuel (${canAfford} units)`;
  }
}

function updateSellAllButton() {
  const sellAllBtn = document.getElementById("sellAllButton");
  const inventoryPanel = document.getElementById("sidebarInventoryContent");

  if (!sellAllBtn || !inventoryPanel) return;

  const hasInventory = Object.values(player.inventory).some((batches) =>
    batches.some(([qty]) => qty > 0)
  );

  // Only show button if panel is open and inventory has items
  if (inventoryPanel.style.display !== "none" && hasInventory) {
    sellAllBtn.style.display = "block";
  } else {
    sellAllBtn.style.display = "none";
  }
}

function sellBatch(resource, price) {
  const batches = player.inventory[resource];
  let soldQty = 0;
  let totalPaid = 0;
  const remaining = [];
  for (const [qty, paid] of batches) {
    if (paid === price) {
      soldQty += qty;
      totalPaid += qty * paid;
    } else {
      remaining.push([qty, paid]);
    }
  }
  if (soldQty === 0) return log(`No ${resource}  |  ${price}ᶜ to sell.`);
  const sellPrice = systems[player.location].prices[resource] || 0;
  const revenue = soldQty * sellPrice;
  const profit = revenue - totalPaid;
  player.inventory[resource] = remaining;
  player.credits += revenue;
  flash("credits");
  updateUI();
  const profitColor = profit >= 0 ? "text-success" : "text-danger";
  const profitLabel = profit >= 0 ? "Profit" : "Loss";

  log(
    `Sold ${soldQty}${UNIT} of ${resource} at ${sellPrice.toFixed(
      2
    )}ᶜ each (Total: ${revenue.toFixed(2)}ᶜ)`
  );

  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold  ${soldQty}${UNIT} of ${resource}  |  <span class="text-info">${sellPrice.toFixed(
      2
    )}ᶜ</span> each (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(
      2
    )}ᶜ</span>)`
  );
}

function updateInventoryDisplay() {
  const container = document.getElementById("inventoryItemsContainer");
  container.innerHTML = "";
  let hasItems = false;
  if (!hasItems) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "text-muted text-center";
    emptyMsg.textContent = "";
    container.appendChild(emptyMsg);
  }
  let totalValue = 0;
  // First, calculate total value across all batches
  for (const res in player.inventory) {
    const batches = player.inventory[res];
    const marketPrice = systems[player.location]?.prices[res] || 0;
    totalValue += batches.reduce((sum, [qty]) => sum + qty * marketPrice, 0);
  }
  // Update the header
  const inventoryHeader = document.getElementById("inventoryHeader");
  if (inventoryHeader) {
    inventoryHeader.innerHTML = ``;
  }
  for (const res in player.inventory) {
    const batches = player.inventory[res];
    if (batches.length === 0) continue;
    hasItems = true;
    const resDiv = document.createElement("div");
    resDiv.className = "resource-group";
    const resHeader = document.createElement("div");
    resHeader.className =
      "d-flex justify-content-between align-items-center mb-1";
    const resTitle = document.createElement("strong");
    resTitle.className = "text-warning";
    resTitle.textContent = res;
    const sellAllBtn = document.createElement("button");
    sellAllBtn.className = "sell-batch-btn";
    sellAllBtn.textContent = "Sell Resource";
    sellAllBtn.onclick = () => {
      sellAllOfResource(res);
    };
    resHeader.appendChild(resTitle);
    resHeader.appendChild(sellAllBtn);
    resDiv.appendChild(resHeader);
    const grouped = {};
    batches.forEach(([qty, price]) => {
      grouped[price] = (grouped[price] || 0) + qty;
    });

    Object.entries(grouped).forEach(([price, qty]) => {
      const line = document.createElement("div"); // ✅ Define first
      line.className = "batch-line";

      const infoSpan = document.createElement("span");
      infoSpan.textContent = `${qty}${UNIT}  |  ${parseFloat(price).toFixed(
        2
      )}ᶜ`;

      const moveBtn = document.createElement("button");
      moveBtn.className = "move-batch-btn btn-sm";
      moveBtn.textContent = "↪ Move to Vault";
      moveBtn.onclick = () => {
        moveBatch(res, parseFloat(price), qty, "inventory", "vault");
        updateUI();
      };

      const sellBtn = document.createElement("button");
      sellBtn.className = "sell-batch-btn";
      sellBtn.textContent = "Sell";
      sellBtn.onclick = () => {
        sellBtn.disabled = true;
        sellBtn.textContent = "Processing...";
        setTimeout(() => {
          sellBatch(res, parseFloat(price));
          updateUI();
        }, 100);
      };

      line.appendChild(infoSpan);
      line.appendChild(moveBtn);
      line.appendChild(sellBtn);
      resDiv.appendChild(line);
    });

    const marketPrice = systems[player.location]?.prices[res] || 0;
    const resValue = batches.reduce((sum, [qty]) => sum + qty * marketPrice, 0);
    totalValue += resValue;
    const valueLine = document.createElement("div");
    valueLine.className = "market-value-line";
    valueLine.innerHTML = `<span>Value:</span> ${resValue.toFixed(2)}ᶜ</span>`;
    resDiv.appendChild(valueLine);
    container.appendChild(resDiv);
  }
}

function togglePanel(id) {
  const el = document.getElementById(id);
  const toggle = el.previousElementSibling.querySelector(".expandable");
  if (el.style.display === "none") {
    el.style.display = "block";
    toggle.textContent = "▲▼ | Open";
  } else {
    el.style.display = "none";
    toggle.textContent = "▼▲ | Closed";
  }

  // Update sell button visibility if we're toggling the inventory panel
  if (id === "sidebarInventoryContent") {
    updateSellAllButton();
  }
}

function moveBatch(resource, price, qty, from, to) {
  const source = player[from][resource];
  const target = player[to][resource];

  let moved = 0;
  for (let i = 0; i < source.length && moved < qty; i++) {
    let [q, p] = source[i];
    if (p === price) {
      const take = Math.min(q, qty - moved);
      source[i][0] -= take;
      target.push([take, p]);
      moved += take;
    }
  }

  // Clean up empty entries
  player[from][resource] = source.filter(([q]) => q > 0);
}

function updateVaultDisplay() {
  const container = document.getElementById("vaultInventoryContent");
  if (!container) {
    console.warn("Vault container not found in DOM.");
    return;
  }
  container.innerHTML = "";
  let hasItems = false;
  let totalVaultValue = 0;

  for (const res in player.vault) {
    const batches = player.vault[res];
    if (!batches || batches.length === 0) continue;

    hasItems = true;

    const resDiv = document.createElement("div");
    resDiv.className = "resource-group2";

    const resHeader = document.createElement("div");
    resHeader.className =
      "d-flex justify-content-between align-items-center mb-1";

    const resTitle = document.createElement("strong");
    resTitle.className = "resource-name2";
    resTitle.textContent = res;

    resHeader.appendChild(resTitle);
    resDiv.appendChild(resHeader);

    const grouped = {};
    batches.forEach(([qty, price]) => {
      grouped[price] = (grouped[price] || 0) + qty;
    });

    Object.entries(grouped).forEach(([price, qty]) => {
      const line = document.createElement("div");
      line.className = "batch-line";

      const infoSpan = document.createElement("span");
      infoSpan.textContent = `${qty}${UNIT}  |  ${parseFloat(price).toFixed(
        2
      )}ᶜ`;

      const moveBtn = document.createElement("button");
      moveBtn.className = "move-batch-btn2 btn-sm";
      moveBtn.textContent = "↩ Move to Inventory";
      moveBtn.onclick = () => {
        moveBatch(res, parseFloat(price), qty, "vault", "inventory");
        updateUI();
      };

      line.appendChild(infoSpan);
      line.appendChild(moveBtn);
      resDiv.appendChild(line);
    });

    container.appendChild(resDiv);
  }
  if (!hasItems) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "text-muted text-center";
    emptyMsg.textContent = "";
    container.appendChild(emptyMsg);
  }
}

function flashMarketCell(system, res) {
  const index = RESOURCE_TYPES.indexOf(res);
  if (index === -1) return;
  const table = document.getElementById("marketTable");
  const rows = table.getElementsByTagName("tr");
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.firstChild.textContent === system) {
      const cell = row.children[index + 1]; // +1 to skip "System" column
      if (cell) {
        cell.classList.add("flash-highlight");
        setTimeout(() => cell.classList.remove("flash-highlight"), 600);
      }
      break;
    }
  }
}

function interpolateColor(startHex, endHex, factor) {
  const hexToRgb = (hex) => hex.match(/\w\w/g).map((c) => parseInt(c, 16));
  const rgbToHex = (rgb) =>
    "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const result = start.map(
    (startVal, i) => startVal + factor * (end[i] - startVal)
  );
  return rgbToHex(result);
}

function processAndRenderShipments() {
  const now = Date.now();
  const shipmentsList = document.getElementById("shipments");
  if (!shipmentsList) return;
  let updated = false;
  const remainingShipments = [];
  for (const s of player.shipments) {
    const timeRemaining = s.time - now;
    if (timeRemaining <= 0) {
      // 🔧 Ensure the inventory slot exists
      if (!player.inventory[s.resource]) {
        player.inventory[s.resource] = [];
      }
      player.inventory[s.resource].push([s.amount, s.price]);
      log(`${s.amount}ᵣ of ${s.resource} added to inventory.`);
      updated = true;
    } else {
      remainingShipments.push(s);
    }
  }

  player.shipments = remainingShipments;
  const title = document.getElementById("shipmentsTitle");
  if (title) {
    const count = player.shipments.length;
    title.innerHTML =
      `Incoming Shipments:` +
      (count > 0 ? ` <span class="text-info">${count}</span>` : "");
  }
  const sortedShipments = [...player.shipments].sort((a, b) => a.time - b.time);
  const topThree = sortedShipments.slice(0, 3);
  const shipmentSection = document
    .querySelector("#shipments")
    .closest("section");
  if (player.shipments.length === 0) {
    shipmentsList.innerHTML = `<li>No incoming shipments.</li>`;
  } else {
    shipmentSection.style.display = "block";
    shipmentsList.innerHTML = topThree
      .map((s) => {
        const remaining = Math.max(0, Math.ceil((s.time - now) / 1000));
        const totalTime =
          Math.ceil((s.time - (s.createdAt || Date.now() - 60000)) / 1000) ||
          60;
        const progress = Math.min(1, Math.max(0, 1 - remaining / totalTime));
        const hue = Math.floor(120 * progress); // 0 = red, 120 = green
        const color = `hsl(${hue}, 90%, 50%)`;

        return `<li style="border-left: 6px solid ${color}; padding-left: 6px;">
				<div class="d-flex justify-content-between">
					<span class="text-muted small">${s.id}  | ETA:  ${remaining}s</span>
				</div>
				<div class="progress" style="height: 4px; margin-top: 2px;">
					<div class="progress-bar" role="progressbar" style="width: ${(
            progress * 100
          ).toFixed(1)}%; background-color: ${color};"></div>
				</div>
			</li>`;
      })
      .join("");
  }
  if (updated) {
    updateInventoryDisplay();
    updateSellAllButton();
  }
}

function updateUI() {
  toggleTravelButton();
  updateRefuelButton();
  updateInventoryDisplay();
  updateVaultDisplay();
  updateSellAllButton();
  updateSellButton();
  document.getElementById("location").innerText = player.location;
  document.getElementById("credits").innerText = player.credits.toFixed(2);
  document.getElementById("fuel").innerText = player.fuel;
  const marketTable = document.getElementById("marketTable");
  const headingTable = document.getElementById("marketHeadingTable");
  marketTable.innerHTML = "";
  headingTable.innerHTML = "";
  const resourceMin = {},
    resourceMax = {};
  RESOURCE_TYPES.forEach((res) => {
    const prices = SYSTEM_NAMES.map((system) => systems[system].prices[res]);
    resourceMin[res] = Math.min(...prices);
    resourceMax[res] = Math.max(...prices);
  });
  let highestSpread = 0;
  let highestResource = "";
  RESOURCE_TYPES.forEach((res) => {
    const spread = resourceMax[res] - resourceMin[res];
    if (spread > highestSpread) {
      highestSpread = spread;
      highestResource = res;
    }
  });
  // 🧭 Main Header Row
  const headerRow = document.createElement("tr");
  headerRow.innerHTML =
    `<th onclick="sortBy('System')">System${
      sortState.column === "System" ? (sortState.ascending ? " ↑" : " ↓") : ""
    }</th>` +
    RESOURCE_TYPES.map((res) => {
      const isSorted = sortState.column === res;
      const icon = isSorted ? (sortState.ascending ? " ↑" : " ↓") : "";
      return `<th onclick="sortBy('${res}')">${res}${icon}</th>`;
    }).join("");
  headingTable.appendChild(headerRow);
  // 📦 Data rows
  let systemsToRender =
    marketViewMode === "current" ? [player.location] : [...SYSTEM_NAMES];
  // 🔝 Move player's current system to the top
  if (marketViewMode !== "current") {
    systemsToRender = systemsToRender.filter((s) => s !== player.location);
    systemsToRender.unshift(player.location);
  }
  if (sortState.column) {
    const isSystem = sortState.column === "System";
    systemsToRender.sort((a, b) => {
      const valA = isSystem ? a : systems[a].prices[sortState.column];
      const valB = isSystem ? b : systems[b].prices[sortState.column];
      return sortState.ascending ? valA - valB : valB - valA;
    });
  }
  systemsToRender.forEach((system) => {
    const row = document.createElement("tr");
    if (system === player.location) row.classList.add("current-system-row");
    row.innerHTML = `<td>${system}</td>`;
    RESOURCE_TYPES.forEach((res) => {
      const market = systems[system].market?.[res];
      if (!market) {
        row.innerHTML += `<td class="text-muted text-center unavailable-cell">N/A</td>`;
        return;
      }
      const price = systems[system].prices[res];
      const isMax = price === resourceMax[res];
      const isMin = price === resourceMin[res];
      const trend = lastPrices[`${system}-${res}`]?.trend ?? "same";
      const supplyDemand = `
      <div class="supply-demand-info">
        <span> S:  ${market.supply}${UNIT}</span><br>
        <span> D:  ${market.demand}${UNIT}</span>
      </div>`;
      row.innerHTML += `
          <td class="${
            isMax ? "high-price" : isMin ? "low-price" : ""
          } price-cell">
            ${price.toFixed(2)}
            <span class="trend-indicator ${trend}"></span>
            ${supplyDemand}
          </td>`;
    });
    marketTable.appendChild(row);
  });
  // 🔽 Spread row BELOW market table (in its own table)
  spreadTable.innerHTML = ""; // clear old spread rows
  const bottomSpreadRow = document.createElement("tr");
  bottomSpreadRow.innerHTML =
    `<th class="text-muted text-center small text-start"> DΞLTΛ</th>` +
    RESOURCE_TYPES.map((res) => {
      const diff = (resourceMax[res] - resourceMin[res]).toFixed(2);
      const highlightClass = res === highestResource ? "highest-spread" : "";
      return `<th class="${highlightClass} small text-center" title="High: ${resourceMax[
        res
      ].toFixed(2)}Δ, Low: ${resourceMin[res].toFixed(2)}Δ">
            ${diff} Δ
          </th>`;
    }).join("");
  spreadTable.appendChild(bottomSpreadRow);
}

function updateSellButton() {
  const res = document.getElementById("sellResourceSelect").value;
  const amtInput = document.getElementById("sellAmount");
  const sellBtn = document.querySelector("button.btn-danger"); // assuming this is the Sell button

  if (!sellBtn || !res) return;

  const inventoryAmount =
    player.inventory[res]?.reduce((sum, [qty]) => sum + qty, 0) || 0;

  sellBtn.disabled = inventoryAmount === 0;
  sellBtn.innerText = inventoryAmount === 0 ? "No Inventory" : "Sell";
}

function toggleMarketView() {
  marketViewMode = marketViewMode === "all" ? "current" : "all";
  const btn = document.getElementById("toggleMarketView");

  btn.innerHTML =
    marketViewMode === "all"
      ? '<i class="fa fa-toggle-on" aria-hidden="true"></i> | Current System'
      : '<i class="fa fa-toggle-off" aria-hidden="true"></i> | All Systems';

  updateUI();
}

function sortBy(col) {
  sortState.ascending = sortState.column === col ? !sortState.ascending : true;
  sortState.column = col;
  updateUI();
}

function travel() {
  const dest = document.getElementById("travelSearch").value;
  const travelBtn = document.getElementById("travelButton");
  const warpOverlay = document.getElementById("warp-overlay");
  const warpTimer = document.getElementById("warp-timer");
  const warpRoute = document.getElementById("warp-route");
  if (dest === player.location) return;
  const travelCost = Math.floor(Math.random() * 11) + 5; // 5 to 15 fuel
  if (player.fuel < travelCost)
    return log(`Not enough fuel. Need ${travelCost}ᵣ.`);

  const delay = Math.floor(Math.random() * 2000) + 3000;
  let secondsLeft = Math.ceil(delay / 1000);
  // Set warp message
  warpRoute.textContent = `Warping from ${player.location} to ${dest}`;
  warpTimer.textContent = `~eta ${secondsLeft}s`;
  log(`Warping to ${dest}... ~eta ${secondsLeft}s`);
  travelBtn.disabled = true;
  disableTradeControls(true);
  warpOverlay.classList.remove("d-none");
  const interval = setInterval(() => {
    secondsLeft--;
    warpTimer.textContent = `~eta ${secondsLeft}s`;
    if (secondsLeft <= 0) clearInterval(interval);
  }, 1000);
  setTimeout(() => {
    player.location = dest;
    player.fuel -= travelCost;
    flash("fuel");
    log(`Arrived at ${dest}`);
    log(`Used ${travelCost}ᵣ to warp.`);
    updateUI();
    warpOverlay.classList.add("d-none");
    travelBtn.disabled = false;
    disableTradeControls(false);
  }, delay);
}

function disableTradeControls(disabled) {
  const ids = [
    "buyResource",
    "buyAmount",
    "refuelButton",
    "sellAllMaterials",
    "travelSearch",
    "travelButton",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
  document.querySelectorAll("button").forEach((btn) => {
    if (
      btn.textContent.includes("Buy Resource") ||
      btn.textContent.includes("Sell Resource")
    ) {
      btn.disabled = disabled;
    }
  });
}

function processNpcShipments() {
  const now = Date.now();
  for (const corp of Object.values(corporations)) {
    const remaining = [];
    for (const s of corp.shipments || []) {
      if (s.time <= now) {
        if (!corp.inventory[s.resource]) {
          corp.inventory[s.resource] = [];
        }
        corp.inventory[s.resource].push([s.amount, s.price]);
      } else {
        remaining.push(s);
      }
    }
    corp.shipments = remaining;
  }
}

function refuel() {
  const fuelPrice = systems[player.location].prices["Fuel"];
  const fuelNeeded = FUEL_CAPACITY - player.fuel;
  if (fuelNeeded === 0) return log("Your fuel tank is already full.");
  const affordableUnits = Math.floor(player.credits / fuelPrice);
  if (affordableUnits === 0)
    return log("You don't have enough credits to buy any fuel.");
  const unitsToBuy = Math.min(fuelNeeded, affordableUnits);
  const totalCost = unitsToBuy * fuelPrice;
  player.fuel += unitsToBuy;
  player.credits -= totalCost;
  flash("fuel");
  flash("credits");
  log(`Refueled ${unitsToBuy} units at ${fuelPrice.toFixed(2)}ᶜ each.`);
  updateUI();
}

function buyMaterial() {
  const res = document.getElementById("buyResourceSelect").value;
  const amtInput = document.getElementById("buyAmount");
  const amt = parseInt(amtInput.value);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  const systemMarket = systems[player.location].market[res];
  if (!systemMarket)
    return log(`${res} is not available in ${player.location}.`);

  const basePrice = systems[player.location].prices[res];
  const { buyPrice } = getBuySellPrice(basePrice);
  const importTaxRate = systems[player.location]?.tariffs?.importTaxRate || 0;
  const taxAmount = buyPrice * amt * importTaxRate;
  const totalCost = buyPrice * amt + taxAmount;

  if (player.credits < totalCost) {
    const maxAffordable = Math.floor(player.credits / buyPrice);
    if (maxAffordable > 0) {
      amtInput.value = maxAffordable;
      return log(
        `Not enough credits. You can afford up to ${maxAffordable}x ${res}.`
      );
    } else {
      return log("Not enough credits to buy any units.");
    }
  }

  // ✅ Set the trade function
  pendingTrade = () => {
    player.credits -= totalCost;
    player.shipments.push({
      id: `SHIP-${Date.now().toString().slice(-5)}`,
      resource: res,
      amount: amt,
      price: buyPrice,
      time: Date.now() + getRandomShipmentDelay(),
    });

    recentPlayerBuys[`${player.location}-${res}`] = Date.now();

    const market = systems[player.location].market[res];
    market.demand += amt;

    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice =
      buyPrice * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
    newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
    systems[player.location].prices[res] = parseFloat(newPrice.toFixed(2));
    flash("credits");
    updateUI();
  };

  // ✅ Run it
  showTradeSummary("buy", res, amt, buyPrice);
  updateBuyBreakdown();
}

function showTradeSummary(type, res, amt, price) {
  const location = player.location;
  const tariffs = systems[location]?.tariffs || { importTaxRate: 0, exportTaxRate: 0 };

  const baseTotal = price * amt;
  const taxRate = type === "buy" ? tariffs.importTaxRate : tariffs.exportTaxRate;
  const taxAmount = baseTotal * taxRate;
  const finalTotal = type === "buy" ? baseTotal + taxAmount : baseTotal - taxAmount;

  if (pendingTrade) {
    pendingTrade();
    pendingTrade = null;
    saveGameState();

    const action = type === "buy" ? "Purchased" : "Sold";
    const taxLabel = type === "buy" ? "Tax" : "Tax";

    log(
      `${action} ${amt}${UNIT} of ${res} at ${price.toFixed(2)}ᶜ each ` +
      `(${taxLabel}: ${taxAmount.toFixed(2)}ᶜ, Total: ${finalTotal.toFixed(2)}ᶜ)`
    );

    logMarket(
      `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> ${type === "buy" ? "purchased" : "sold"} 
      ${amt}${UNIT} of ${res} in ${location} | 
      <span class="text-info">${price.toFixed(2)}ᶜ</span> each 
      (${taxLabel}: <span class="text-danger">${taxAmount.toFixed(2)}ᶜ</span>, 
      <span class="text-success">Total: ${finalTotal.toFixed(2)}ᶜ</span>)`
    );
  }
}





function sellMaterial() {
  const res = document.getElementById("sellResourceSelect").value;
  const amt = parseInt(document.getElementById("sellAmount").value);
  if (!amt || amt <= 0) return log("Invalid quantity.");

  let market = systems[player.location].market[res];
  const priceExists = systems[player.location].prices?.[res];
  let price = priceExists ?? RESOURCE_DATA[res].base;

  // 🚀 If resource is unavailable, create market on-the-fly
  if (!market) {
    log(`ΛΞ started trade of ${res} in ${player.location}.`);
    const base = RESOURCE_DATA[res].base;
    price = base * 1.25;

    // Create market entry
    market = { supply: 0, demand: 0 };
    systems[player.location].market[res] = market;
    systems[player.location].prices[res] = price;

    // 🧠 Save this new market to localStorage
    const key = `${player.location}-${res}`;
    const now = Date.now();

    // Update availability
    const availabilityCache = JSON.parse(
      localStorage.getItem("atlasMarketAvailability") || "{}"
    );
    availabilityCache[key] = { available: true, timestamp: now };
    localStorage.setItem(
      "atlasMarketAvailability",
      JSON.stringify(availabilityCache)
    );

    // Update market data
    const marketDataCache = JSON.parse(
      localStorage.getItem("atlasMarketData") || "{}"
    );
    marketDataCache[key] = { supply: 0, demand: 0 };
    localStorage.setItem("atlasMarketData", JSON.stringify(marketDataCache));
  }

  const inv = player.inventory[res];
  const inventoryAmount = inv.reduce((sum, [qty]) => sum + qty, 0);
  if (inventoryAmount === 0) return log("No inventory to sell.");

  const sellAmt = Math.min(amt, inventoryAmount);

  const lastBuyTime = recentPlayerBuys[`${player.location}-${res}`];
  if (lastBuyTime && Date.now() - lastBuyTime < TRADE_COOLDOWN) {
    const wait = Math.ceil((TRADE_COOLDOWN - (Date.now() - lastBuyTime)) / 1000);
    return log(`Reselling ${res} in ${player.location} is restricted. Wait ${wait}s.`);
  }

  pendingTrade = () => {
    let toSell = sellAmt,
      sold = 0,
      totalPaid = 0;

    for (let i = 0; i < inv.length && toSell > 0; i++) {
      const [qty, paid] = inv[i];
      const take = Math.min(qty, toSell);
      totalPaid += take * paid;
      sold += take;
      inv[i][0] -= take;
      toSell -= take;
    }
    player.inventory[res] = inv.filter(([q]) => q > 0);

    const revenue = sold * price;
    player.credits += revenue;
    flash("credits");

    const profit = revenue - totalPaid;
    const profitLabel = profit >= 0 ? "Profit" : "Loss";
    const profitColor = profit >= 0 ? "text-success" : "text-danger";

    logMarket(
      `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> sold ${sold}${UNIT} of ${res} in ${
        player.location
      } | <span class="text-info">${price.toFixed(
        2
      )}ᶜ</span> each (<span class="${profitColor}">${profitLabel}: ${profit.toFixed(
        2
      )}ᶜ</span>)`
    );

    // Add supply and adjust price if market was created or already existed
    market.supply += sold;
    const ratio = market.demand / market.supply;
    const base = RESOURCE_DATA[res].base;
    let newPrice =
      price * (ratio > 1 ? 1 + (ratio - 1) * 0.01 : 1 - (1 - ratio) * 0.01);
    newPrice = Math.max(base * 0.5, Math.min(base * 3, newPrice));
    systems[player.location].prices[res] = parseFloat(newPrice.toFixed(2));

    updateUI();
  };

  showTradeSummary("sell", res, sellAmt, price);
  updateSellBreakdown();
}

function renderTariffModal() {
  const tbody = document.getElementById("tariffTableBody");
  tbody.innerHTML = "";

  SYSTEM_NAMES.forEach((name) => {
    const { importTaxRate, exportTaxRate } = systems[name]?.tariffs || {
      importTaxRate: 0,
      exportTaxRate: 0,
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${name}</td>
      <td class="text-info">${(importTaxRate * 100).toFixed(1)}%</td>
      <td class="text-danger">${(exportTaxRate * 100).toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}




let lastTick = Date.now();
let tickCounter = 0;
let saveCounter = 0;
let npcTradeCounter = 0;

function tick() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;
  tickCounter++;
  // Process shipments
  processAndRenderShipments();
  processNpcShipments();
  updateGameAgeDisplay();
  renderContracts();
  checkContracts();
  tryFulfillContracts();

  // Simulate NPCs every 3 seconds
  if (now - npcLastTick >= 1000) {
    simulateNpcBehavior();
    for (let i = 0; i < 2; i++) {
      simulateNpcBehavior();
    }
    npcLastTick = now;
  }

  setInterval(() => {
    renderActiveContracts();
    checkContracts(); // to expire them
  }, 1000);

  // Save every 60 seconds
  if (now - lastSaveTick >= 60000) {
    saveGameState(true);
    lastSaveTick = now;
  }
  // Update UI every second (optional – could limit this if performance needed)
  updateUI();
}
let npcLastTick = Date.now();
let lastSaveTick = Date.now();

window.onload = function () {
  initGame();
  simulateNpcBehavior();
  renderTaxSidebar();
  saveGameState((logToConsole = false));
  for (let i = 0; i < 3; i++) generateRandomContract();

  document.getElementById("openTariffBtn").addEventListener("click", () => {
    renderTariffModal();
    document.getElementById("tariffModal").style.display = "block";
  });
  document.getElementById("closeTariffBtn").addEventListener("click", () => {
    document.getElementById("tariffModal").style.display = "none";
  });
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("tariffModal")) {
      document.getElementById("tariffModal").style.display = "none";
    }
  });
  

  document.getElementById("closeAboutBtn").addEventListener("click", () => {
    document.getElementById("aboutModal").style.display = "none";
  });
  document.getElementById("openAboutBtn").addEventListener("click", () => {
    document.getElementById("aboutModal").style.display = "block";
  });
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("aboutModal")) {
      document.getElementById("aboutModal").style.display = "none";
    }
  });

  document
    .getElementById("travelSearch")
    .addEventListener("change", toggleTravelButton);

  // ✅ Hide loading screen after full load
  // Unified Tick Engine
  setInterval(() => {
    if (!gamePaused) tick();
  }, 1000);
  document.getElementById("loadingOverlay").style.display = "none";
};
