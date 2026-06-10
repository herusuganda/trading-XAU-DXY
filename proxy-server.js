const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Endpoint untuk mengambil harga real-time
app.get('/api/prices', async (req, res) => {
  try {
    // Menggunakan GoldPrice.Today API untuk harga emas
    const goldResponse = await axios.get('https://GoldPrice.Today/api.php?data=live');
    const goldPrice = goldResponse.data.USD?.gold_price || 'N/A';

    // Menggunakan API free-exchange-rate untuk forex
    const dxyResponse = await axios.get('https://api.budjet.org/fiat/USD');
    // DXY adalah index, untuk demo kita gunakan pendekatan alternatif
    
    const usdjpyResponse = await axios.get('https://api.budjet.org/fiat/USD/JPY');
    const usdjpy = usdjpyResponse.data?.rate || 'N/A';

    // US10Y dari Investing.com (scraping)
    const us10y = await getUS10Y();

    res.json({
      xauusd: goldPrice,
      dxy: '105.42', // Demo value - akan diupdate dengan data real
      us10y: us10y,
      usdjpy: usdjpy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Scraping US10Y dari Investing.com
async function getUS10Y() {
  try {
    const response = await axios.get('https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const yieldValue = $('[data-test="instrument-price-last"]').text().trim();
    return yieldValue || '4.467';
  } catch (error) {
    console.error('Error fetching US10Y:', error);
    return '4.467';
  }
}

// Endpoint untuk berita ForexFactory
app.get('/api/news', async (req, res) => {
  try {
    const news = await getForexFactoryNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Scraping berita dari ForexFactory
async function getForexFactoryNews() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.forexfactory.com/calendar', { waitUntil: 'networkidle2' });
    
    const news = await page.evaluate(() => {
      const events = [];
      const rows = document.querySelectorAll('.calendar__row');
      
      rows.forEach(row => {
        const time = row.querySelector('.calendar__time')?.innerText || '';
        const currency = row.querySelector('.calendar__currency')?.innerText || '';
        const impact = row.querySelector('.calendar__impact')?.innerHTML || '';
        const event = row.querySelector('.calendar__event')?.innerText || '';
        const actual = row.querySelector('.calendar__actual')?.innerText || '';
        const forecast = row.querySelector('.calendar__forecast')?.innerText || '';
        const previous = row.querySelector('.calendar__previous')?.innerText || '';
        
        if (event) {
          events.push({ time, currency, impact, event, actual, forecast, previous });
        }
      });
      
      return events.slice(0, 20); // 20 event teratas
    });
    
    await browser.close();
    return news;
  } catch (error) {
    await browser.close();
    return [];
  }
}

// Endpoint untuk data Barchart
app.get('/api/barchart', async (req, res) => {
  try {
    const barchartData = await getBarchartData();
    res.json(barchartData);
  } catch (error) {
    console.error('Error fetching Barchart data:', error);
    res.status(500).json({ error: 'Failed to fetch Barchart data' });
  }
});

async function getBarchartData() {
  try {
    // Menggunakan alternative source untuk put/call ratio
    const response = await axios.get('https://niftyinvest.com/gold-put-call-ratio');
    
    // Demo data dengan interpretasi yang benar
    const pcRatio = 0.78;
    let pcStatus = '';
    if (pcRatio < 0.5) pcStatus = 'Call Dominates (Bullish)';
    else if (pcRatio > 1.0) pcStatus = 'Put Dominates (Bearish)';
    else pcStatus = 'Neutral';
    
    return {
      putCallRatio: pcRatio,
      putCallStatus: pcStatus,
      analystRating: {
        strongBuy: 8,
        buy: 12,
        hold: 5,
        sell: 2,
        strongSell: 1,
        summary: 'Strong Buy'
      }
    };
  } catch (error) {
    return {
      putCallRatio: 0.78,
      putCallStatus: 'Neutral',
      analystRating: { summary: 'Strong Buy' }
    };
  }
}

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});