const fs = require('fs');

// Read the original 10 records
const data = fs.readFileSync('test-data-10.csv', 'utf-8');
const lines = data.trim().split('\n');
const header = lines[0];
const records = lines.slice(1);

// Create 1,000 records with IDs starting from 111 (to avoid conflicts with existing records)
const newRecords = [];
for (let i = 0; i < 1000; i++) {
  const record = records[i % records.length];
  const fields = record.split(',');
  
  // Create unique values for each record, starting ID from 111
  const newId = 111 + i; // Start from 111 to avoid conflicts
  const newName = fields[1].replace(/\d+/, '') + ' ' + (newId);
  const newEmail = `agent${newId}@example.com`;
  
  // Reconstruct the record with unique values
  const newRecord = [newId, newName, fields[2], newEmail, fields[4], fields[5], fields[6], fields[7]].join(',');
  newRecords.push(newRecord);
}

// Write the new CSV file
const csv1000 = [header, ...newRecords].join('\n');
fs.writeFileSync('test-data-1000-stage3.csv', csv1000);

console.log('✅ Created test-data-1000-stage3.csv with 1,000 records (IDs 111-1110)');
console.log('📊 Total lines:', (csv1000.split('\n')).length);