#!/usr/bin/env node

/**
 * OG Image generator using Puppeteer
 * Generates og-image.png from HTML template
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  console.log('🎨 Starting OG image generation...\n');
  
  const htmlPath = path.join(__dirname, 'dropmagic-og-image.html');
  const outputPath = path.join(__dirname, 'public', 'og-image.png');
  
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ HTML template not found: ${htmlPath}`);
    process.exit(1);
  }
  
  // Ensure public directory exists
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log('📄 Rendering: dropmagic-og-image.html');
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    
    // Wait for fonts and any animations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.screenshot({
      path: outputPath,
      type: 'png'
    });
    
    await page.close();
    
    console.log(`✅ Created: ${outputPath}\n`);
    console.log('🎉 OG image generated successfully!');
    console.log('📊 Size: 1200x630px (standard OG image size)');
    console.log('\n💡 Next steps:');
    console.log('   1. Review the image: open public/og-image.png');
    console.log('   2. The image is already referenced in index.html');
    console.log('   3. Deploy to make it accessible at https://dropmagic.ai/og-image.png');
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

generateOGImage().catch(err => {
  console.error(err);
  process.exit(1);
});
