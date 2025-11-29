const fs = require('fs');

// Read the original 10 records
const data = fs.readFileSync('test-data-10.csv', 'utf-8');
const lines = data.trim().split('\n');
const header = lines[0];
const records = lines.slice(1);

// Create 100 records with IDs starting from 11 (to avoid conflicts with existing records)
const newRecords = [];
for (let i = 0; i < 100; i++) {
  const record = records[i % records.length];
  const fields = record.split(',');
  
  // Create unique values for each record, starting ID from 11
  const newId = 11 + i; // Start from 11 to avoid conflicts
  const newName = fields[1].replace(/\d+/, '') + ' ' + (newId);
  const newEmail = `agent${newId}@example.com`;
  
  // Reconstruct the record with unique values
  const newRecord = [newId, newName, fields[2], newEmail, fields[4], fields[5], fields[6], fields[7]].join(',');
  newRecords.push(newRecord);
}

// Write the new CSV file
const csv100 = [header, ...newRecords].join('\n');
fs.writeFileSync('test-data-100-stage2.csv', csv100);

console.log('✅ Created test-data-100-stage2.csv with 100 records (IDs 11-110)');
console.log('📊 Total lines:', (csv100.split('\n')).length);