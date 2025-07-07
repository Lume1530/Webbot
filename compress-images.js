import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For VPS deployment, we'll output directly to root directory
// No need to create separate directories

// Image compression configurations
const compressionConfigs = {
  // Hero image - high quality but compressed
  'dls_website_hero.png': {
    quality: 85,
    format: 'webp',
    width: 1200, // Max width for hero
    height: null // Maintain aspect ratio
  },
  // Website image - medium quality
  'website_image.png': {
    quality: 80,
    format: 'webp',
    width: 800,
    height: null
  },
  // Logo - high quality for crisp text
  'Dls_grouplogo.png': {
    quality: 90,
    format: 'webp',
    width: 400,
    height: null
  },
  // Client logos - medium quality
  'client_logos': {
    quality: 75,
    format: 'webp',
    width: 200,
    height: null
  }
};

async function compressImage(inputPath, outputPath, config) {
  try {
    console.log(`Compressing ${inputPath}...`);
    
    let sharpInstance = sharp(inputPath);
    
    // Resize if width is specified
    if (config.width) {
      sharpInstance = sharpInstance.resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply compression based on format
    if (config.format === 'webp') {
      await sharpInstance
        .webp({ quality: config.quality })
        .toFile(outputPath);
    } else if (config.format === 'jpeg') {
      await sharpInstance
        .jpeg({ quality: config.quality })
        .toFile(outputPath);
    } else {
      await sharpInstance
        .png({ quality: config.quality })
        .toFile(outputPath);
    }
    
    // Get file sizes
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)}: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% reduction)`);
    
  } catch (error) {
    console.error(`❌ Error compressing ${inputPath}:`, error.message);
  }
}

async function compressAllImages() {
  console.log('🚀 Starting image compression...\n');
  
  // Compress main images
  const mainImages = [
    { input: 'dls_website_hero.png', config: compressionConfigs['dls_website_hero.png'] },
    { input: 'website_image.png', config: compressionConfigs['website_image.png'] },
    { input: 'Dls_grouplogo.png', config: compressionConfigs['Dls_grouplogo.png'] }
  ];
  
      for (const image of mainImages) {
      if (fs.existsSync(image.input)) {
        const outputPath = path.basename(image.input, path.extname(image.input)) + '.' + image.config.format;
        await compressImage(image.input, outputPath, image.config);
      } else {
        console.log(`⚠️  ${image.input} not found, skipping...`);
      }
    }
  
  // Compress client logos
  console.log('\n📁 Compressing client logos...');
  const clientLogos = fs.readdirSync('./Client_logo').filter(file => file.endsWith('.png'));
  
  for (const logo of clientLogos) {
    const inputPath = path.join('./Client_logo', logo);
    const outputPath = path.join('./Client_logo', path.basename(logo, '.png') + '.webp');
    await compressImage(inputPath, outputPath, compressionConfigs['client_logos']);
  }
  
  console.log('\n🎉 Image compression complete!');
  console.log(`📁 Compressed images saved to root directory`);
  console.log(`📁 Compressed client logos saved to Client_logo/ directory`);
  
  // Generate usage instructions
  console.log('\n📋 Next steps:');
  console.log('1. Replace the original images with the compressed versions');
  console.log('2. Update image paths in your code to use .webp format');
  console.log('3. Consider adding fallback .png versions for older browsers');
}

// Run compression
compressAllImages().catch(console.error); 