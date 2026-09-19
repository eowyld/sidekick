// node og-shot.mjs   →  og.png (1200×630)
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,          // 1200×630 exact, c'est la taille demandée
})
await page.goto('file://' + join(here, 'og-image.html'))
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: join(here, 'og.png') })
await browser.close()
console.log('✓ og.png')
