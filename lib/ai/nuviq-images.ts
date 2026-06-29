import fs from 'fs';
import path from 'path';

export interface NuviqImage {
  base64: string;
  type: string;
  name: string;
  category: string;
}

const NUVIQ_IMAGES_DIR = path.join(process.cwd(), 'public', 'nuviq_images');

/**
 * Load Nuviq product images from the local filesystem
 * Returns images as base64-encoded data for inclusion in AI requests
 */
export function loadNuviqImages(): NuviqImage[] {
  const images: NuviqImage[] = [];
  
  try {
    // Define categories and sample images from each
    const categories = ['hot_drinks', 'cold_drinks', 'dessert'];
    const samplesPerCategory = 4; // Get top 4 from each category
    
    for (const category of categories) {
      const categoryPath = path.join(NUVIQ_IMAGES_DIR, category);
      
      if (!fs.existsSync(categoryPath)) {
        console.log(`[NuviqImages] Category directory not found: ${categoryPath}`);
        continue;
      }
      
      const files = fs.readdirSync(categoryPath)
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
        .slice(0, samplesPerCategory);
      
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const ext = path.extname(file).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        
        // Extract product name from filename (e.g., "01_hot_spanish__27.png" -> "hot spanish")
        const nameMatch = file.match(/\d+_([a-z_]+)__/);
        const productName = nameMatch 
          ? nameMatch[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : file.replace(/\.[^/.]+$/, '');
        
        images.push({
          base64,
          type: mimeType,
          name: `${category}/${productName}`,
          category
        });
        
        console.log(`[NuviqImages] Loaded ${file} (${Math.round(base64.length / 1024)}KB)`);
      }
    }
    
    console.log(`[NuviqImages] Total images loaded: ${images.length}`);
  } catch (error) {
    console.error('[NuviqImages] Error loading images:', error);
  }
  
  return images;
}

/**
 * Get a curated selection of Nuviq images representing each category
 */
export function getFeaturedNuviqImages(): NuviqImage[] {
  const featured: NuviqImage[] = [];
  
  try {
    // Pick representative images from each category
    const selections = [
      { category: 'hot_drinks', files: ['01_hot_spanish__27.png', '03_hot_cortado__26.png', '11_cappuccino__26.png', '13_espresso__20.png'] },
      { category: 'cold_drinks', files: ['16_hibiscus__31.png', '17_ice_americano__25.png', '25_ice_spanish_latte__27.png', '30_acai_smoothie__38.png'] },
      { category: 'dessert', files: ['34_london_cheesecake__32.png', '35_marshmallow_nutella_cake__32.png', '36_coconut_mango_cake__40.png'] }
    ];
    
    for (const { category, files } of selections) {
      for (const file of files) {
        const filePath = path.join(NUVIQ_IMAGES_DIR, category, file);
        
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const base64 = buffer.toString('base64');
          const ext = path.extname(file).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
          
          const nameMatch = file.match(/\d+_([a-z_]+)__/);
          const productName = nameMatch 
            ? nameMatch[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : file.replace(/\.[^/.]+$/, '');
          
          featured.push({
            base64,
            type: mimeType,
            name: productName,
            category
          });
        }
      }
    }
    
    console.log(`[NuviqImages] Featured images loaded: ${featured.length}`);
  } catch (error) {
    console.error('[NuviqImages] Error loading featured images:', error);
  }
  
  return featured;
}
