const body = document.getElementById("body");
const themeToggle = document.getElementById("themeToggle");
const clickSound = document.getElementById("clickSound");

// Tracker-specific elements
const priceList = document.getElementById("priceList");
const tokenInput = document.getElementById("tokenInput");
const suggestions = document.getElementById("suggestions");
const addToken = document.getElementById("addToken");
const refresh = document.getElementById("refresh");
const autoRefresh = document.getElementById("autoRefresh");
const trendingList = document.getElementById("trendingList");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalDetails = document.getElementById("modalDetails");
const alertPrice = document.getElementById("alertPrice");
const setAlert = document.getElementById("setAlert");
const closeModal = document.getElementById("closeModal");

// Swap-specific elements
const tokenAddress = document.getElementById("tokenAddress");
const usdAmount = document.getElementById("usdAmount");
const calculateSwap = document.getElementById("calculateSwap");
const swapResult = document.getElementById("swapResult");

let tokens = JSON.parse(localStorage.getItem("tokens")) || [];
let alerts = JSON.parse(localStorage.getItem("alerts")) || {};
let autoRefreshInterval = null;
let isSoundReady = false;

// Sanitize user input to prevent XSS
function sanitizeInput(input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
}

// Initialize click sound after user interaction
document.addEventListener("click", () => {
    if (!isSoundReady && clickSound) {
        clickSound.load();
        clickSound.play().then(() => {
            isSoundReady = true;
            clickSound.pause();
            clickSound.currentTime = 0;
        }).catch(err => console.error("Sound init failed:", err));
    }
}, { once: true });

// Play sound on any click
document.addEventListener("click", playClickSound);

function playClickSound() {
    if (isSoundReady && clickSound) {
        clickSound.play().catch(err => console.error("Sound play failed:", err));
    }
}

function initializeTheme() {
    const isDark = localStorage.getItem("theme") !== "light";
    body.classList.toggle("bg-gray-900", isDark);
    body.classList.toggle("bg-white", !isDark);
    body.classList.toggle("text-white", isDark);
    body.classList.toggle("text-gray-900", !isDark);
    if (sidebar) {
        sidebar.classList.toggle("dark", !isDark);
    }
    if (priceList) {
        priceList.classList.toggle("dark", !isDark);
        updatePrices();
    }
    document.querySelectorAll("nav").forEach(nav => {
        nav.classList.toggle("dark", !isDark);
    });
    document.querySelectorAll(".token-card").forEach(card => {
        card.classList.toggle("dark", !isDark);
    });
    if (themeToggle) themeToggle.textContent = isDark ? "🌙" : "☀";
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const newTheme = body.classList.contains("bg-gray-900") ? "light" : "dark";
        body.classList.toggle("bg-gray-900");
        body.classList.toggle("bg-white");
        body.classList.toggle("text-white");
        body.classList.toggle("text-gray-900");
        if (sidebar) {
            sidebar.classList.toggle("dark");
        }
        if (priceList) {
            priceList.classList.toggle("dark");
            updatePrices();
        }
        document.querySelectorAll("nav").forEach(nav => {
            nav.classList.toggle("dark");
        });
        document.querySelectorAll(".token-card").forEach(card => {
            card.classList.toggle("dark", newTheme === "light");
        });
        themeToggle.textContent = newTheme === "dark" ? "🌙" : "☀";
        localStorage.setItem("theme", newTheme);
    });
}

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        document.documentElement.classList.toggle("sidebar-open");
        if (sidebar.classList.contains("open")) {
            body.classList.add("overflow-hidden");
        } else {
            body.classList.remove("overflow-hidden");
        }
    });
}

if (autoRefresh) {
    autoRefresh.addEventListener("change", () => {
        if (autoRefresh.checked) {
            autoRefreshInterval = setInterval(updatePrices, 30000);
        } else {
            clearInterval(autoRefreshInterval);
        }
    });
}

async function fetchTokenPrice(tokenQuery) {
    try {
        const query = sanitizeInput(tokenQuery.toLowerCase().trim());
        // Rate-limiting: 1-second delay to avoid abuse
        await new Promise(resolve => setTimeout(resolve, 1000));
        // DexScreener API
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
        const dexData = await dexResponse.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
            const pair = dexData.pairs[0];
            let blockchain = pair.chainId || "Unknown";
            if (blockchain === "osmosis") {
                if (pair.baseToken.symbol.toLowerCase() === "sol" || pair.baseToken.name.toLowerCase().includes("solana")) {
                    blockchain = "solana";
                } else if (pair.baseToken.symbol.toLowerCase() === "btc" || pair.baseToken.name.toLowerCase().includes("bitcoin")) {
                    blockchain = "bitcoin";
                }
            }
            return {
                name: pair.baseToken.name,
                symbol: pair.baseToken.symbol,
                price: parseFloat(pair.priceUsd),
                priceChange: pair.priceChange?.h24 || 0,
                marketCap: pair.marketCap || 0,
                volume: pair.volume?.h24 || 0,
                liquidity: pair.liquidity?.usd || 0,
                image: pair.info?.imageUrl || "https://via.placeholder.com/32",
                socials: {
                    twitter: pair.info?.socials?.find(s => s.type === "twitter")?.url || "",
                    telegram: pair.info?.socials?.find(s => s.type === "telegram")?.url || "",
                    website: pair.info?.websites?.[0]?.url || ""
                },
                chart: pair.url,
                blockchain: blockchain,
                source: "DexScreener"
            };
        }

        // CoinGecko API with API key (replace YOUR_API_KEY)
        const cgResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${query}?market_data=true&community_data=true`, {
            headers: {
                "Authorization": "Bearer YOUR_API_KEY"
            }
        });
        if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            let blockchain = cgData.platforms?.[Object.keys(cgData.platforms)[0]] ? Object.keys(cgData.platforms)[0] : "Unknown";
            if (cgData.id === "sui" && blockchain === "cronos") {
                blockchain = "sui";
            } else if (cgData.id === "solana") {
                blockchain = "solana";
            } else if (cgData.id === "bitcoin") {
                blockchain = "bitcoin";
            }
            return {
                name: cgData.name,
                symbol: cgData.symbol.toUpperCase(),
                price: cgData.market_data.current_price.usd,
                priceChange: cgData.market_data.price_change_percentage_24h || 0,
                marketCap: cgData.market_data.market_cap.usd || 0,
                volume: cgData.market_data.total_volume.usd || 0,
                liquidity: 0,
                image: cgData.image.thumb,
                socials: {
                    twitter: cgData.links.twitter_screen_name ? `https://twitter.com/${cgData.links.twitter_screen_name}` : "",
                    telegram: cgData.links.telegram_channel_identifier ? `https://t.me/${cgData.links.telegram_channel_identifier}` : "",
                    website: cgData.links.homepage?.[0] || ""
                },
                chart: `https://www.coingecko.com/en/coins/${cgData.id}`,
                blockchain: blockchain,
                source: "CoinGecko"
            };
        }
        throw new Error("Token not found");
    } catch (error) {
        console.error(`Error fetching token ${tokenQuery}:`, error);
        return null;
    }
}

async function fetchSuggestions(query) {
    if (!query || !suggestions) return;
    const sanitizedQuery = sanitizeInput(query);
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sanitizedQuery.toLowerCase())}`);
        const data = await response.json();
        suggestions.innerHTML = "";
        if (data.coins && data.coins.length > 0) {
            data.coins.slice(0, 5).forEach(coin => {
                suggestions.innerHTML += `<li class="px-4 py-2 hover:bg-gray-700 cursor-pointer dark:hover:bg-gray-400 text-white dark:text-gray-900" data-id="${coin.id}">${coin.name} (${coin.symbol})</li>`;
            });
            suggestions.classList.remove("hidden");
            document.querySelectorAll("#suggestions li").forEach(item => {
                item.addEventListener("click", () => {
                    tokenInput.value = item.dataset.id;
                    suggestions.classList.add("hidden");
                });
            });
        } else {
            suggestions.innerHTML = '<li class="px-4 py-2 text-red-400 dark:text-red-600">No tokens found</li>';
            suggestions.classList.remove("hidden");
        }
    } catch (error) {
        suggestions.innerHTML = '<li class="px-4 py-2 text-red-400 dark:text-red-600">Error fetching suggestions</li>';
        suggestions.classList.remove("hidden");
    }
}

async function fetchTrending() {
    if (!trendingList) return;
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/search/trending");
        const data = await response.json();
        trendingList.innerHTML = "";
        if (data.coins && data.coins.length > 0) {
            data.coins.slice(0, 5).forEach(coin => {
                trendingList.innerHTML += `
                    <button class="gradient-button text-white px-4 py-2 rounded w-full text-left add-trending dark:bg-gray-600 dark:text-gray-900" data-id="${coin.item.id}">${coin.item.name} (${coin.item.symbol})</button>
                `;
            });
            document.querySelectorAll(".add-trending").forEach(button => {
                button.addEventListener("click", () => {
                    const token = button.dataset.id;
                    if (token && !tokens.includes(token)) {
                        tokens.push(token);
                        localStorage.setItem("tokens", JSON.stringify(tokens));
                        updatePrices();
                    }
                });
            });
        } else {
            trendingList.innerHTML = '<p class="text-red-400 dark:text-red-600">No trending tokens available</p>';
        }
    } catch (error) {
        trendingList.innerHTML = '<p class="text-red-400 dark:text-red-600">Error loading trending tokens</p>';
    }
}

async function calculateSwapValue() {
    if (!swapResult) return;
    const address = sanitizeInput(tokenAddress.value.trim());
    const amount = parseFloat(usdAmount.value) || 0;
    if (!address || amount <= 0) {
        swapResult.textContent = "Please enter a valid token address and a positive USD amount";
        return;
    }
    const tokenData = await fetchTokenPrice(address);
    if (tokenData && tokenData.price > 0) {
        const tokenAmount = amount / tokenData.price;
        swapResult.textContent = `${amount} USD ≈ ${tokenAmount.toFixed(4)} ${tokenData.symbol}`;
    } else {
        swapResult.textContent = "Invalid token address or price unavailable. Try another address.";
    }
}

async function checkAlerts() {
    for (const token in alerts) {
        const data = await fetchTokenPrice(token);
        if (data && data.price >= alerts[token]) {
            if (Notification.permission === "granted") {
                new Notification(`${data.name} reached ${data.price}!`);
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification(`${data.name} reached ${data.price}!`);
                    }
                });
            }
            delete alerts[token];
            localStorage.setItem("alerts", JSON.stringify(alerts));
        }
    }
}

async function updatePrices() {
    if (!priceList) return;
    priceList.innerHTML = '<div class="col-span-full text-center"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div></div>';
    priceList.innerHTML = "";
    const isDark = body.classList.contains("bg-gray-900");
    for (const token of tokens) {
        const data = await fetchTokenPrice(token);
        if (data) {
            const changeColor = data.priceChange >= 0 ? "text-green-400 dark:text-green-600" : "text-red-400 dark:text-red-600";
            const sentiment = Math.random() > 0.5 ? "Positive" : "Neutral";
            priceList.innerHTML += `
                <div class="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg hover:scale-105 transition-transform cursor-pointer dark:bg-gray-200 token-card ${isDark ? '' : 'dark'}" data-token="${token}">
                    <img src="${data.image}" alt="${data.name}" class="w-12 h-12 mx-auto mb-2">
                    <h2 class="text-lg sm:text-xl font-semibold text-white dark:text-gray-900">${data.name} (${data.symbol})</h2>
                    <p class="text-base sm:text-lg text-white dark:text-gray-900">${data.price.toFixed(2)}</p>
                    <p class="text-xs sm:text-sm ${changeColor}">24h: ${data.priceChange.toFixed(2)}%</p>
                    <p class="text-xs sm:text-sm text-gray-400 dark:text-gray-600">Sentiment: ${sentiment}</p>
                    <p class="text-xs sm:text-sm text-gray-400 dark:text-gray-600">Blockchain: ${data.blockchain}</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        ${data.socials.website ? `<a href="${data.socials.website}" target="_blank" class="text-xs text-blue-400 hover:underline dark:text-blue-600">Website</a>` : ""}
                        ${data.socials.twitter ? `<a href="${data.socials.twitter}" target="_blank" class="text-xs text-blue-400 hover:underline dark:text-blue-600">Twitter</a>` : ""}
                        ${data.socials.telegram ? `<a href="${data.socials.telegram}" target="_blank" class="text-xs text-blue-400 hover:underline dark:text-blue-600">Telegram</a>` : ""}
                        <a href="${data.chart}" target="_blank" class="text-xs text-blue-400 hover:underline dark:text-blue-600">Chart</a>
                    </div>
                    <button class="mt-2 gradient-button text-white px-2 py-1 rounded w-full sm:w-auto remove-token dark:bg-gray-600 dark:text-gray-900" data-token="${token}" aria-label="Remove token">Remove</button>
                </div>
            `;
        } else {
            priceList.innerHTML += `
                <div class="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg dark:bg-gray-200 token-card ${isDark ? '' : 'dark'}">
                    <h2 class="text-lg sm:text-xl font-semibold text-white dark:text-gray-900">${token}</h2>
                    <p class="text-base sm:text-lg text-red-400 dark:text-red-600">Not found</p>
                    <button class="mt-2 gradient-button text-white px-2 py-1 rounded w-full remove-token dark:bg-gray-600 dark:text-gray-900" data-token="${token}" aria-label="Remove token">Remove</button>
                </div>
            `;
        }
    }
    if (!tokens.length) {
        priceList.innerHTML = '<p class="col-span-full text-center text-white dark:text-gray-900">Add a token to track</p>';
    }
    document.querySelectorAll(".remove-token").forEach(button => {
        button.addEventListener("click", () => {
            tokens = tokens.filter(t => t !== button.dataset.token);
            delete alerts[button.dataset.token];
            localStorage.setItem("tokens", JSON.stringify(tokens));
            localStorage.setItem("alerts", JSON.stringify(alerts));
            updatePrices();
        });
    });
    document.querySelectorAll("[data-token]").forEach(card => {
        card.addEventListener("click", async () => {
            if (event.target.classList.contains("remove-token") || event.target.tagName === "A") return;
            const token = card.dataset.token;
            const data = await fetchTokenPrice(token);
            if (data) {
                modalTitle.textContent = `${data.name} (${data.symbol})`;
                modalDetails.innerHTML = `
                    Price: ${data.price.toFixed(2)}<br>
                    24h Change: ${data.priceChange.toFixed(2)}%<br>
                    Market Cap: ${data.marketCap.toLocaleString()}<br>
                    24h Volume: ${data.volume.toLocaleString()}<br>
                    Liquidity: ${data.liquidity.toLocaleString()}<br>
                    Blockchain: ${data.blockchain}
                `;
                alertPrice.value = "";
                modal.classList.remove("hidden");
            }
        });
    });
    await checkAlerts();
}

if (tokenInput) tokenInput.addEventListener("input", () => fetchSuggestions(sanitizeInput(tokenInput.value.trim())));
if (addToken) addToken.addEventListener("click", () => {
    const token = sanitizeInput(tokenInput.value.trim());
    if (token && !tokens.includes(token)) {
        tokens.push(token);
        localStorage.setItem("tokens", JSON.stringify(tokens));
        tokenInput.value = "";
        suggestions.classList.add("hidden");
        updatePrices();
    }
});
if (setAlert) setAlert.addEventListener("click", () => {
    const token = modalTitle.textContent.split(" (")[0];
    const price = parseFloat(alertPrice.value);
    if (price) {
        alerts[token] = price;
        localStorage.setItem("alerts", JSON.stringify(alerts));
        modal.classList.add("hidden");
    }
});
if (closeModal) closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
});