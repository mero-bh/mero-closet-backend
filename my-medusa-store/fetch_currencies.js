const fs = require('fs');
const https = require('https');

const url = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const countries = JSON.parse(data);
            const currencyData = [];
            const seen = new Set();

            countries.forEach(country => {
                const name = country.name.common;
                const currencies = country.currencies;
                
                if (!currencies) return;
                
                Object.entries(currencies).forEach(([code, details]) => {
                    // Create entry for every country-currency pair
                    currencyData.push({
                        code: code,
                        symbol: details.symbol || "",
                        name: details.name || "",
                        country: name
                    });
                });
            });

            // Sort by country name
            currencyData.sort((a, b) => a.country.localeCompare(b.country));

            let tsContent = `// This file is auto-generated. 
// It contains a comprehensive list of world currencies with country names and symbols.
// Note: Medusa backend primarily uses the ISO 4217 'code' for logic.

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  country: string;
}

export const currenciesData: CurrencyInfo[] = [
`;

            currencyData.forEach(item => {
                const safeCountry = item.country.replace(/"/g, '\\"');
                const safeName = item.name.replace(/"/g, '\\"');
                const safeSymbol = item.symbol.replace(/"/g, '\\"');
                
                tsContent += `  {
    code: "${item.code}",
    symbol: "${safeSymbol}",
    name: "${safeName}",
    country: "${safeCountry}"
  },
`;
            });

            tsContent += `];

// Unique list of lowercase currency codes for Medusa seed
export const currencies: string[] = Array.from(new Set(currenciesData.map(c => c.code.toLowerCase())));
`;

            fs.writeFileSync('c:/Users/code4/Desktop/medusa/my-medusa-store/src/scripts/currencies.ts', tsContent);
            console.log(`Successfully generated currencies.ts with ${currencyData.length} entries.`);

        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
