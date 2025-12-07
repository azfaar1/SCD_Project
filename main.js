require('dotenv').config();

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('./events/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function createBackup(action) {
  (async () => {
    try {
      const records = await db.listRecords();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFileName = `backup_${timestamp}.json`;
      const backupPath = path.join(backupDir, backupFileName);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        action: action,
        records: records,
        totalRecords: records.length
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`📂 Backup created: ${backupFileName}`);
    } catch (error) {
      console.log(`⚠️ Could not create backup: ${error.message}`);
    }
  })();
}

function searchRecords() {
  rl.question('Enter search keyword: ', async (keyword) => {
    try {
      const matches = await db.searchRecords(keyword);
      
      if (!matches || matches.length === 0) {
        console.log('No records found.');
      } else {
        console.log(`\nFound ${matches.length} matching record(s):`);
        console.log('='.repeat(60));
        matches.forEach((record, index) => {
          console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Value: ${record.value} | Created: ${record.createdAt ? record.createdAt.split('T')[0] : 'N/A'}`);
        });
        console.log('='.repeat(60));
      }
    } catch (error) {
      console.log(`❌ Error searching: ${error.message}`);
    }
    menu();
  });
}

function sortRecords() {
  console.log('\n=== Sort Options ===');
  console.log('1. Sort by Name');
  console.log('2. Sort by Creation Date');
  console.log('3. Sort by Update Date');
  console.log('=====================');
  
  rl.question('Choose field to sort by (1-3): ', (fieldChoice) => {
    let field;
    switch(fieldChoice) {
      case '1': field = 'name'; break;
      case '2': field = 'createdAt'; break;
      case '3': field = 'updatedAt'; break;
      default:
        console.log('Invalid option.');
        return sortRecords();
    }
    
    console.log('\n=== Sort Order ===');
    console.log('1. Ascending (A-Z, Oldest first)');
    console.log('2. Descending (Z-A, Newest first)');
    console.log('===================');
    
    rl.question('Choose order (1-2): ', async (orderChoice) => {
      try {
        let order;
        switch(orderChoice) {
          case '1': order = 'asc'; break;
          case '2': order = 'desc'; break;
          default:
            console.log('Invalid option.');
            return sortRecords();
        }
        
        const sortedRecords = await db.sortRecords(field, order);
        
        console.log('\n' + '='.repeat(60));
        console.log(`Sorted Records (by ${field}, ${order === 'asc' ? 'Ascending' : 'Descending'}):`);
        console.log('='.repeat(60));
        
        if (!sortedRecords || sortedRecords.length === 0) {
          console.log('No records to display.');
        } else {
          sortedRecords.forEach((record, index) => {
            let dateDisplay = '';
            if (field === 'createdAt') {
              dateDisplay = record.createdAt ? record.createdAt.split('T')[0] : 'N/A';
            } else if (field === 'updatedAt') {
              dateDisplay = record.updatedAt ? record.updatedAt.split('T')[0] : 'N/A';
            }
            console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | ${field}: ${dateDisplay || record[field]}`);
          });
        }
        console.log('='.repeat(60));
      } catch (error) {
        console.log(`❌ Error sorting: ${error.message}`);
      }
      menu();
    });
  });
}

function exportData() {
  (async () => {
    try {
      const exportData = await db.getAllRecordsForExport();
      const exportTime = new Date().toISOString();
      const exportFileName = 'export.txt';
      const exportPath = path.join(__dirname, exportFileName);
      
      let exportContent = '='.repeat(60) + '\n';
      exportContent += 'NODEVAULT DATA EXPORT\n';
      exportContent += '='.repeat(60) + '\n';
      exportContent += `Export Date: ${new Date().toLocaleString()}\n`;
      exportContent += `Total Records: ${exportData.records.length}\n`;
      exportContent += `File: ${exportFileName}\n`;
      exportContent += '='.repeat(60) + '\n\n';
      
      if (exportData.records.length === 0) {
        exportContent += 'No records found in vault.\n';
      } else {
        exportContent += exportData.formatted;
      }
      
      exportContent += '\n' + '='.repeat(60) + '\n';
      exportContent += 'END OF EXPORT\n';
      exportContent += '='.repeat(60) + '\n';
      
      fs.writeFileSync(exportPath, exportContent);
      console.log(`\n✅ Data exported successfully to ${exportFileName}`);
      console.log(`📁 Location: ${exportPath}`);
      console.log(`📊 Total records exported: ${exportData.records.length}`);
    } catch (error) {
      console.log(`❌ Error exporting: ${error.message}`);
    }
    menu();
  })();
}

function displayStatistics() {
  (async () => {
    try {
      const stats = await db.getStatistics();
      
      console.log('\n' + '='.repeat(40));
      console.log('VAULT STATISTICS');
      console.log('='.repeat(40));
      
      if (stats.message) {
        console.log(stats.message);
      } else {
        console.log(`Total Records: ${stats.totalRecords}`);
        console.log(`Last Modified: ${stats.lastModified}`);
        console.log(`Longest Name: ${stats.longestName} (${stats.longestNameLength} characters)`);
        console.log(`Earliest Record: ${stats.earliestRecord}`);
        console.log(`Latest Record: ${stats.latestRecord}`);
        if (stats.averageNameLength) {
          console.log(`Average Name Length: ${stats.averageNameLength} characters`);
        }
        console.log(`Unique Names: ${stats.uniqueNames}`);
      }
      console.log('='.repeat(40));
    } catch (error) {
      console.log(`❌ Error getting statistics: ${error.message}`);
    }
    menu();
  })();
}

function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. View Vault Statistics
9. Exit
=====================
  `);

  rl.question('Choose option: ', (ans) => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', (name) => {
          rl.question('Enter value: ', async (value) => {
            try {
              const record = await db.addRecord({ name, value });
              console.log(`\n✅ Record added successfully!`);
              console.log(`ID: ${record.id} | Name: ${record.name}`);
              createBackup('add_record');
            } catch (error) {
              console.log(`\n❌ Error: ${error.message}`);
            }
            menu();
          });
        });
        break;

      case '2':
        (async () => {
          try {
            const records = await db.listRecords();
            if (!records || records.length === 0) {
              console.log('\nNo records found.');
            } else {
              console.log(`\n📋 Total Records: ${records.length}`);
              console.log('='.repeat(60));
              records.forEach(r => {
                const createdDate = r.createdAt ? r.createdAt.split('T')[0] : 'N/A';
                console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value} | Created: ${createdDate}`);
              });
              console.log('='.repeat(60));
            }
          } catch (error) {
            console.log(`\n❌ Error listing records: ${error.message}`);
          }
          menu();
        })();
        break;

      case '3':
        rl.question('Enter record ID to update: ', (id) => {
          const idNum = id.trim(); // MongoDB IDs are strings, not numbers
          if (!idNum) {
            console.log('\n❌ Invalid ID. Please enter a valid ID.');
            return menu();
          }
          rl.question('New name: ', (name) => {
            rl.question('New value: ', async (value) => {
              try {
                const updated = await db.updateRecord(idNum, name, value);
                if (updated) {
                  console.log(`\n✅ Record updated!`);
                  console.log(`ID: ${updated.id} | New Name: ${updated.name}`);
                  createBackup('update_record');
                } else {
                  console.log('\n❌ Record not found.');
                }
              } catch (error) {
                console.log(`\n❌ Error: ${error.message}`);
              }
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', async (id) => {
          try {
            const idStr = id.trim();
            if (!idStr) {
              console.log('\n❌ Invalid ID. Please enter a valid ID.');
              return menu();
            }
            const deleted = await db.deleteRecord(idStr);
            if (deleted) {
              console.log(`\n🗑️ Record deleted!`);
              console.log(`Deleted: ID ${deleted.id} | Name: ${deleted.name}`);
              createBackup('delete_record');
            } else {
              console.log('\n❌ Record not found.');
            }
          } catch (error) {
            console.log(`\n❌ Error: ${error.message}`);
          }
          menu();
        });
        break;

      case '5':
        searchRecords();
        break;

      case '6':
        sortRecords();
        break;

      case '7':
        exportData();
        break;

      case '8':
        displayStatistics();
        break;

      case '9':
        console.log('\n👋 Exiting NodeVault...');
        rl.close();
        break;

      default:
        console.log('\n❌ Invalid option. Please choose 1-9.');
        menu();
    }
  });
}

console.log('\n' + '='.repeat(40));
console.log('Welcome to NodeVault');
console.log('='.repeat(40));
menu();
