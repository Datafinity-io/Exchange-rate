const axios = require("axios");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const cron = require("node-cron");

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch and insert reversed exchange rates
const fetchExchangeRates = async () => {
  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.API_KEY}/latest/ETB`
    );

    const { USD, GBP, EUR } = response.data.conversion_rates;

    if (USD && GBP && EUR) {
      // Calculate the reversed rates
      const reversedUSD = 1 / USD;
      const reversedGBP = 1 / GBP;
      const reversedEUR = 1 / EUR;

      console.log("Reversed Rates ->");
      console.log("ETB to USD:", reversedUSD);
      console.log("ETB to GBP:", reversedGBP);
      console.log("ETB to EUR:", reversedEUR);

      // Insert reversed rates into Supabase
      const { data, error } = await supabase.from("official_rate").insert([
        {
          usd: parseFloat(reversedUSD.toFixed(6)),
          euro: parseFloat(reversedEUR.toFixed(6)),
          gbp: parseFloat(reversedGBP.toFixed(6)),
        },
      ]);

      if (error) {
        console.error("Error inserting reversed data into Supabase:", error.message);
      } else {
        console.log("Reversed data successfully inserted into Supabase.");
      }
    } else {
      console.error("Failed to fetch all required rates. Skipping insertion.");
    }
  } catch (error) {
    console.error("Error fetching exchange rate data:", error.message);
  }
};

// Schedule the fetch to run every hour
cron.schedule("0 * * * *", () => {
  console.log("Running scheduled task to fetch reversed exchange rates...");
  fetchExchangeRates();
});

// Also run once immediately on start
fetchExchangeRates();
