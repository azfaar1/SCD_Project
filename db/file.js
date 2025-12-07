const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'vault.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]');

function readDB() {
  const data = fs.readFileSync(dbFile, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// Add this function to get database metadata
function getDBInfo() {
  const stats = fs.statSync(dbFile);
  return {
    size: stats.size,
    mtime: stats.mtime,
    birthtime: stats.birthtime
  };
}

module.exports = { readDB, writeDB, getDBInfo };
