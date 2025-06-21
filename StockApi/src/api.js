const express = require('express');
const { scrapeStockData } = require('./scraper');

const router = express.Router();

router.get('/stocks', async (req, res) => {
  try {
    const stocks = await scrapeStockData(process.env.SCRAPE_URL);
    res.json({
      success: true,
      data: stocks,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
