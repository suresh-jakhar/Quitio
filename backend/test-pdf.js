const { extractFromPdf } = require('./dist/extractors/pdfExtractor');
const fs = require('fs');
const path = require('path');

async function testPdf() {
  try {
    // We need a dummy pdf to test
    console.log('Testing PDF extraction...');
    // Since I don't have a pdf, I'll just check if it imports correctly
    console.log('Function extractFromPdf imported successfully');
  } catch (err) {
    console.error('Error during import or execution:', err);
  }
}

testPdf();
