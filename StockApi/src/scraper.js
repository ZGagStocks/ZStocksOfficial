const axios = require('axios');
const cheerio = require('cheerio');

const scrapeStockData = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(data);
    const stocks = {
      seeds: [],
      gear: [],
      egg: [],
      honey: [],
      cosmetics: []
    };

    // Helper function to parse stock items
    const parseItems = (selector, category) => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.includes('x')) {
          const [name, quantity] = text.split(' x').map(str => str.trim());
          if (name && quantity) {
            stocks[category].push({
              name,
              quantity: parseInt(quantity),
              buyPrice: 'N/A', // Not provided in HTML
              sellPrice: 'N/A', // Not provided in HTML
              availability: quantity > 0 ? 'In Stock' : 'Out of Stock'
            });
          }
        }
      });
    };

    // Parse each stock category
    parseItems('div:contains("GEAR STOCK") + div div:contains("x")', 'gear');
    parseItems('div:contains("EGG STOCK") + div div:contains("x")', 'egg');
    parseItems('div:contains("SEEDS STOCK") + div div:contains("x")', 'seeds');
    parseItems('div:contains("HONEY STOCK") + div div:contains("x")', 'honey');
    parseItems('div:contains("COSMETICS STOCK") + div div:contains("x")', 'cosmetics');

    return stocks;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      throw new Error('Access blocked, possibly due to CAPTCHA or anti-bot measures. Consider using the official Vulcan Discord bot or contacting the website owner.');
    }
    throw new Error(`Scraping failed: ${error.message}`);
  }
};

module.exports = { scrapeStockData };
