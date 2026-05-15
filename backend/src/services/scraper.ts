import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

async function scrapeWithCheerio(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $('script, style, nav, header, footer, aside, [aria-hidden="true"]').remove();

  const selectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="description"]',
    '[class*="job-detail"]',
    '[class*="posting"]',
    'article',
    'main',
    '.content',
    '#content',
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 200) {
      return el.text().replace(/\s+/g, ' ').trim();
    }
  }

  return $('body').text().replace(/\s+/g, ' ').trim();
}

async function scrapeWithPuppeteer(url: string): Promise<string> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 10000 });

    // Get rendered HTML then parse with cheerio (avoids DOM type conflicts)
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  } finally {
    await browser.close();
  }
}

export async function scrapeJobUrl(url: string): Promise<string> {
  logger.info('Scraper', `Attempting Cheerio scrape: ${url}`);

  try {
    const text = await scrapeWithCheerio(url);
    if (text.length > 200) {
      logger.info('Scraper', `Cheerio success: ${text.length} chars`);
      return text;
    }
    throw new Error('Insufficient content from Cheerio');
  } catch (cheerioError) {
    logger.warn('Scraper', `Cheerio failed: ${(cheerioError as Error).message}. Trying Puppeteer...`);

    try {
      const text = await scrapeWithPuppeteer(url);
      if (text.length > 200) {
        logger.info('Scraper', `Puppeteer success: ${text.length} chars`);
        return text;
      }
      throw new Error('Insufficient content from Puppeteer');
    } catch (puppeteerError) {
      logger.error('Scraper', `Puppeteer failed: ${(puppeteerError as Error).message}`);
      throw new AppError(
        'Failed to scrape the URL. The site may block automated access. Please paste the job description text instead.',
        422
      );
    }
  }
}
