const fs = require('fs');
const content = fs.readFileSync('../src/types/database.types.ts', 'utf16le');
const match = content.match(/verification_status[^\n]*/g);
console.log(match);
