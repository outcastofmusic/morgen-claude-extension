const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  console.log('Building Morgen Calendar Extension...');
  
  try {
    // Clean dist directory
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true });
    }
    fs.mkdirSync(distPath);
    
    // Build the main bundle
    await esbuild.build({
      entryPoints: ['src/index.js'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist/index.js',
      external: ['@modelcontextprotocol/sdk'],
      format: 'cjs',
      banner: {
        js: '#!/usr/bin/env node'
      },
      minify: false, // Keep readable for debugging
      sourcemap: true,
      metafile: true,
      logLevel: 'info'
    });
    
    // Make the output executable
    fs.chmodSync('dist/index.js', '755');
    
    // Copy manifest.json to dist
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    
    // Copy assets
    const assetsPath = path.join(distPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    // Copy icon files
    const iconFiles = [
      'icon-light.svg',
      'icon-dark.svg',
      'icon-16.png',
      'icon-32.png',
      'icon-48.png',
      'icon-64.png',
      'icon-128.png'
    ];
    
    iconFiles.forEach(file => {
      const src = path.join(__dirname, 'assets', file);
      const dest = path.join(assetsPath, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
    
    // Create screenshots directory
    const screenshotsPath = path.join(assetsPath, 'screenshots');
    if (!fs.existsSync(screenshotsPath)) {
      fs.mkdirSync(screenshotsPath, { recursive: true });
    }
    
    console.log('✅ Build completed successfully!');
    console.log(`📁 Output directory: ${distPath}`);
    console.log('\nNext steps:');
    console.log('1. Run "npm test" to test the extension');
    console.log('2. Run "npx @anthropic-ai/dxt init" to initialize DXT package');
    console.log('3. Run "npx @anthropic-ai/dxt pack" to create .dxt file');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = { build };