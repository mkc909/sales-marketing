const fs = require('fs');

// Read the original 10 records
const data = fs.readFileSync('test-data-10.csv', 'utf-8');
const lines = data.trim().split('\n');
const header = lines[0];
const records = lines.slice(1);

// Create 10,000 records by cycling through the original 10
const newRecords = [];
for (let i = 0; i < 10000; i++) {
  const record = records[i % records.length];
  const fields = record.split(',');
  
  // Create unique values for each record
  const newId = 1111 + i; // Start from 1111 to avoid conflicts
  const newName = fields[1].replace(/\d+/, '') + ' ' + (newId);
  const newEmail = fields[3].replace('@', `${newId}@`);
  
  // Reconstruct the record with unique values
  const newRecord = [newId, newName, fields[2], newEmail, fields[4], fields[5], fields[6], fields[7]].join(',');
  newRecords.push(newRecord);
}

// Write the new CSV file
const csv10000 = [header, ...newRecords].join('\n');
fs.writeFileSync('test-data-10000-stage4.csv', csv10000);

console.log('✅ Created test-data-10000-stage4.csv with 10,000 records');
console.log('📊 Total lines:', (csv10000.split('\n')).length);
console.log('🔢 ID range: 1111 to 11110');