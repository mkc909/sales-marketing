const fs = require('fs');

// Read the original 10 records
const data = fs.readFileSync('test-data-10.csv', 'utf-8');
const lines = data.trim().split('\n');
const header = lines[0];
const records = lines.slice(1);

// Create 100 records by cycling through the original 10
const newRecords = [];
for (let i = 0; i < 100; i++) {
  const record = records[i % records.length];
  const fields = record.split(',');
  
  // Create unique values for each record
  const newId = parseInt(fields[0]) + i;
  const newName = fields[1].replace(/\d+/, '') + ' ' + (i + 1);
  const newEmail = fields[3].replace('@', `${i}@`);
  
  // Reconstruct the record with unique values
  const newRecord = [newId, newName, fields[2], newEmail, fields[4], fields[5], fields[6], fields[7]].join(',');
  newRecords.push(newRecord);
}

// Write the new CSV file
const csv100 = [header, ...newRecords].join('\n');
fs.writeFileSync('test-data-100.csv', csv100);

console.log('✅ Created test-data-100.csv with 100 records');
console.log('📊 Total lines:', (csv100.split('\n')).length);