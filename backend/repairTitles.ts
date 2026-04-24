
import pool from '../src/utils/db';
import { extractSmartTitle } from '../src/services/cardService';

async function repairTitles() {
  console.log('--- Repairing Card Titles ---');
  
  try {
    const result = await pool.query('SELECT id, title, content_type, extracted_text, metadata FROM cards');
    console.log(`Found ${result.rows.length} cards.`);
    
    let repairedCount = 0;
    
    for (const card of result.rows) {
      const originalName = card.metadata?.original_name || card.raw_content || '';
      const currentTitle = card.title;
      
      // Check if title is garbage (file-xxxx or very long/short/untitled)
      const isGarbage = 
        /^file-[\d\-]+/.test(currentTitle.toLowerCase()) || 
        currentTitle === 'Untitled Document' ||
        currentTitle === 'Uploaded File' ||
        currentTitle === 'PDF Document' ||
        currentTitle.length < 3;
        
      if (isGarbage) {
        const newTitle = extractSmartTitle(card.extracted_text, originalName, card.metadata?.pdf_title);
        
        if (newTitle && newTitle !== currentTitle) {
          console.log(`Repairing [${card.id}]: "${currentTitle}" -> "${newTitle}"`);
          await pool.query('UPDATE cards SET title = $1, updated_at = NOW() WHERE id = $2', [newTitle, card.id]);
          repairedCount++;
        }
      }
    }
    
    console.log(`\nSuccessfully repaired ${repairedCount} card titles.`);
  } catch (err) {
    console.error('Error repairing titles:', err);
  } finally {
    process.exit(0);
  }
}

repairTitles();
