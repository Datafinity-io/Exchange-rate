const puppeteer = require("puppeteer");
const { createClient } = require("@supabase/supabase-js");
const cron = require("node-cron");
const dotenv = require("dotenv");
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndStoreRates() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const getRate = async (path) => {
      try {
        await page.goto(`https://www.ethioblackmarket.com/${path}`, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        return await page.$eval("#livePrice", (el) => el.textContent.trim().split(' ')[0]);
      } catch (error) {
        console.error(`Error fetching rate for path "${path}":`, error);
        return null;
      }
    };

    const usd = await getRate("");
    const gbp = await getRate("pound");
    const euro = await getRate("euro");

    console.log("USD:", usd, "GBP:", gbp, "EUR:", euro);

    if (usd && gbp && euro) {
      await supabase.from("black_market_rate").insert([
        {
          usd: parseInt(usd, 10),
          euro: parseInt(euro, 10),
          gbp: parseInt(gbp, 10),
        },
      ]);
    } else {
      console.error("Failed to fetch all rates. Skipping database insertion.");
    }
  } catch (error) {
    console.error("Error in fetchAndStoreRates:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

cron.schedule("*/5 * * * *", async () => {
  try {
    await fetchAndStoreRates();
  } catch (error) {
    console.error("Error in scheduled task:", error);
  }
});

(async () => {
  try {
    await fetchAndStoreRates();
  } catch (error) {
    console.error("Error in initial fetchAndStoreRates call:", error);
  }
})();
