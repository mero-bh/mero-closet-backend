import json
import requests
import sys

# URL to fetch
url = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"

try:
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    
    # Process data
    currency_data = []
    seen_codes = set()
    
    for country in data:
        try:
            name = country.get("name", {}).get("common", "")
            currencies = country.get("currencies", {})
            
            if not currencies:
                continue
                
            # Iterate over currencies
            for code, details in currencies.items():
                code = code.upper()
                symbol = details.get("symbol", "")
                currency_name = details.get("name", "")
                
                # We want a list entry for every country-currency pair?
                # The user wants "CountryName (Symbol)".
                # But typically we want unique currency codes for the seed.
                # However, for the reference list, we can have multiple.
                # Let's create a list of objects.
                
                # Check if we should skip common ones if duplicated?
                # Actually, many countries use EUR. Germany, France, etc.
                # We should probably list them all in the detailed data, 
                # but valid codes must be unique for the seed.
                
                if not name or not code:
                    continue
                    
                entry = {
                    "code": code,
                    "symbol": symbol,
                    "name": currency_name,
                    "country": name
                }
                currency_data.append(entry)
                
        except Exception as e:
            continue

    # Sort by country name
    currency_data.sort(key=lambda x: x["country"])
    
    # Generate TypeScript file content
    ts_content = """// This file is auto-generated. 
// It contains a comprehensive list of world currencies with country names and symbols.
// Note: Medusa backend primarily uses the ISO 4217 'code' for logic.

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  country: string;
}

export const currenciesData: CurrencyInfo[] = [
"""
    
    for item in currency_data:
        # Escape quotes in strings
        country_safe = item['country'].replace('"', '\\"')
        name_safe = item['name'].replace('"', '\\"')
        symbol_safe = item['symbol'].replace('"', '\\"')
        
        ts_content += f"""  {{
    code: "{item['code']}",
    symbol: "{symbol_safe}",
    name: "{name_safe}",
    country: "{country_safe}"
  }},
"""

    ts_content += """];

// Unique list of lowercase currency codes for Medusa seed
export const currencies: string[] = Array.from(new Set(currenciesData.map(c => c.code.toLowerCase())));
"""

    with open("c:/Users/code4/Desktop/medusa/my-medusa-store/src/scripts/currencies.ts", "w", encoding="utf-8") as f:
        f.write(ts_content)
        
    print("Successfully generated currencies.ts with " + str(len(currency_data)) + " entries.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
