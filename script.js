const priceList = document.getElementById("priceList");
const tokenInput = document.getElementById("tokenInput");
const suggestions = document.getElementById("suggestions");
const addToken = document.getElementById("addToken");
const refresh = document.getElementById("refresh");
let tokens = JSON.parse(localStorage.getItem("tokens")) || [];

async function fetchTokenPrice(tokenQuery) {
    try {
        // DexScreener API
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(tokenQuery)}`);
        const dexData = await dexResponse.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
            const pair = dexData.pairs[0];
            return {
                name: pair.baseToken.name,
                symbol: pair.baseToken.symbol,
                price: `$${parseFloat(pair.priceUsd).toFixed(6)}`,
                priceChange: pair.priceChange?.h24 || 0,
                image: pair.info?.imageUrl || "https://via.placeholder.com/32",
                source: "DexScreener"
            };
        }

        // CoinGecko API fallback
        const cgResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${tokenQuery.toLowerCase()}`);
        if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            return {
                name: cgData.name,
                symbol: cgData.symbol.toUpperCase(),
                price: `$${cgData.market_data.current_price.usd.toFixed(2)}`,
                priceChange: cgData.market_data.price_change_percentage_24h || 0,
                image: cgData.image.thumb,
                source: "CoinGecko"
            };
        }
        throw new Error("Token not found");
    } catch (error) {
        return null;
    }
}

async function fetchSuggestions(query) {
    if (!query) {
        suggestions.classList.add("hidden");
        return;
    }
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        suggestions.innerHTML = "";
        data.coins.slice(0, 5).forEach(coin => {
            suggestions.innerHTML += `<li class="px-4 py-2 hover:bg-gray-700 cursor-pointer" data-id="${coin.id}">${coin.name} (${coin.symbol})</li>`;
        });
        suggestions.classList.remove("hidden");
        document.querySelectorAll("#suggestions li").forEach(item => {
            item.addEventListener("click", () => {
                tokenInput.value = item.dataset.id;
                suggestions.classList.add("hidden");
            });
        });
    } catch (error) {
        suggestions.classList.add("hidden");
    }
}

async function updatePrices() {
    priceList.innerHTML = '<div class="col-span-full text-center"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div></div>';
    priceList.innerHTML = "";
    for (const token of tokens) {
        const data = await fetchTokenPrice(token);
        if (data) {
            const changeColor = data.priceChange >= 0 ? "text-green-400" : "text-red-400";
            priceList.innerHTML += `
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg hover:scale-105 transition-transform">
                    <img src="${data.image}" alt="${data.name}" class="w-12 h-12 mx-auto mb-2">
                    <h2 class="text-xl font-semibold">${data.name} (${data.symbol})</h2>
                    <p class="text-lg">${data.price}</p>
                    <p class="text-sm ${changeColor}">24h: ${data.priceChange.toFixed(2)}%</p>
                    <p class="text-sm text-gray-400">Source: ${data.source}</p>
                    <button class="mt-2 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 remove-token" data-token="${token}" aria-label="Remove token">Remove</button>
                </div>
            `;
        } else {
            priceList.innerHTML += `
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 class="text-xl font-semibold">${token}</h2>
                    <p class="text-lg text-red-400">Not found</p>
                    <button class="mt-2 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 remove-token" data-token="${token}" aria-label="Remove token">Remove</button>
                </div>
            `;
        }
    }
    if (!tokens.length) {
        priceList.innerHTML = '<p class="col-span-full text-center">Add a token to track</p>';
    }
    document.querySelectorAll(".remove-token").forEach(button => {
        button.addEventListener("click", () => {
            tokens = tokens.filter(t => t !== button.dataset.token);
            localStorage.setItem("tokens", JSON.stringify(tokens));
            updatePrices();
        });
    });
}

addToken.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (token && !tokens.includes(token)) {
        tokens.push(token);
        localStorage.setItem("tokens", JSON.stringify(tokens));
        tokenInput.value = "";
        suggestions.classList.add("hidden");
        updatePrices();
    }
});

tokenInput.addEventListener("input", () => fetchSuggestions(tokenInput.value.trim()));
refresh.addEventListener("click", updatePrices);

updatePrices();