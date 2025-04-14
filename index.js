const puppeteer = require("puppeteer");
const { createClient } = require("@supabase/supabase-js");
const cron = require("node-cron");
const dotenv = require("dotenv");
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndStoreRates() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const getRate = async (path) => {
    await page.goto(`https://www.ethioblackmarket.com/${path}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    return await page.$eval("#livePrice", (el) => el.textContent.trim());
  };

  const usd = await getRate("");
  const gbp = await getRate("pound");
  const euro = await getRate("euro");

  console.log("USD:", usd, "GBP:", gbp, "EUR:", euro);

  await supabase.from("exchange_rates").insert([{ usd, gbp, euro }]);

  await browser.close();
}

cron.schedule("*/5 * * * *", fetchAndStoreRates);


fetchAndStoreRates();
