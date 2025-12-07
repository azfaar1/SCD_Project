const { connectDB } = require('./connection');
const vaultEvents = require('../events');

// Collection name
const COLLECTION_NAME = 'records';

// Helper to get collection
async function getCollection() {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME);
}

async function addRecord({ name, value }) {
  try {
    const collection = await getCollection();
    const timestamp = new Date().toISOString();
    
    const newRecord = {
      name: name.trim(),
      value: value.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Insert record (MongoDB will auto-generate _id)
    const result = await collection.insertOne(newRecord);
    
    // Add the generated ID to the record
    const savedRecord = {
      id: result.insertedId.toString(), // Use string ID for compatibility
      ...newRecord
    };
    
    vaultEvents.emit('recordAdded', savedRecord);
    return savedRecord;
  } catch (error) {
    console.error('Error adding record:', error);
    throw error;
  }
}

async function listRecords() {
  try {
    const collection = await getCollection();
    console.log('🔍 Fetching records from MongoDB...'); // Debug log
    
    const records = await collection.find({}).toArray();
    console.log(`📊 Found ${records.length} records`); // Debug log
    
    // Convert MongoDB _id to id for compatibility
    const formattedRecords = records.map(record => ({
      id: record._id ? record._id.toString() : 'unknown',
      name: record.name || '',
      value: record.value || '',
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString()
    }));
    
    return formattedRecords;
  } catch (error) {
    console.error('❌ Error listing records:', error);
    return [];
  }
}

async function updateRecord(id, newName, newValue) {
  try {
    const collection = await getCollection();
    const { ObjectId } = require('mongodb');
    
    const updateData = {
      name: newName.trim(),
      value: newValue.trim(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return null;
    }
    
    const updatedRecord = {
      id: result.value._id.toString(),
      name: result.value.name,
      value: result.value.value,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt
    };
    
    vaultEvents.emit('recordUpdated', updatedRecord);
    return updatedRecord;
  } catch (error) {
    console.error('Error updating record:', error);
    return null;
  }
}

async function deleteRecord(id) {
  try {
    const collection = await getCollection();
    const { ObjectId } = require('mongodb');
    
    // Get record before deleting
    const record = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!record) {
      return null;
    }
    
    // Delete the record
    await collection.deleteOne({ _id: new ObjectId(id) });
    
    const deletedRecord = {
      id: record._id.toString(),
      name: record.name,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    
    vaultEvents.emit('recordDeleted', deletedRecord);
    return deletedRecord;
  } catch (error) {
    console.error('Error deleting record:', error);
    return null;
  }
}

// Search function for MongoDB
async function searchRecords(keyword) {
  try {
    const collection = await getCollection();
    const searchTerm = keyword.toLowerCase().trim();
    
    // MongoDB search query (case-insensitive)
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { value: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    const records = await collection.find(query).toArray();
    
    return records.map(record => ({
      id: record._id.toString(),
      name: record.name,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
  } catch (error) {
    console.error('Error searching records:', error);
    return [];
  }
}

// Sort function for MongoDB
async function sortRecords(field, order = 'asc') {
  try {
    const collection = await getCollection();
    
    // Map field names
    let sortField = field;
    if (field === 'createdAt') sortField = 'createdAt';
    if (field === 'updatedAt') sortField = 'updatedAt';
    
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const records = await collection
      .find({})
      .sort({ [sortField]: sortOrder })
      .toArray();
    
    return records.map(record => ({
      id: record._id.toString(),
      name: record.name,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
  } catch (error) {
    console.error('Error sorting records:', error);
    return [];
  }
}

// Statistics function for MongoDB
async function getStatistics() {
  try {
    const collection = await getCollection();
    
    // Get all records
    const records = await listRecords();
    
    if (records.length === 0) {
      return {
        totalRecords: 0,
        message: 'No records to analyze'
      };
    }
    
    // Find longest name
    let longestName = '';
    let longestNameLength = 0;
    let earliestDate = null;
    let latestDate = null;
    let lastModified = null;
    
    records.forEach(record => {
      // Longest name
      if (record.name.length > longestNameLength) {
        longestNameLength = record.name.length;
        longestName = record.name;
      }
      
      // Creation dates
      if (record.createdAt) {
        const creationDate = new Date(record.createdAt);
        if (!earliestDate || creationDate < earliestDate) {
          earliestDate = creationDate;
        }
        if (!latestDate || creationDate > latestDate) {
          latestDate = creationDate;
        }
      }
      
      // Last modification
      if (record.updatedAt) {
        const modDate = new Date(record.updatedAt);
        if (!lastModified || modDate > lastModified) {
          lastModified = modDate;
        }
      }
    });
    
    // Get unique names using MongoDB aggregation
    const uniqueNamesResult = await collection.distinct('name');
    
    return {
      totalRecords: records.length,
      lastModified: lastModified ? lastModified.toLocaleString() : 'N/A',
      longestName,
      longestNameLength,
      earliestRecord: earliestDate ? earliestDate.toISOString().split('T')[0] : 'N/A',
      latestRecord: latestDate ? latestDate.toISOString().split('T')[0] : 'N/A',
      uniqueNames: uniqueNamesResult.length
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return {
      totalRecords: 0,
      message: 'Error retrieving statistics'
    };
  }
}

// Export function
async function getAllRecordsForExport() {
  try {
    const records = await listRecords();
    
    let formatted = '';
    records.forEach((record, index) => {
      formatted += `Record #${index + 1}\n`;
      formatted += `  ID: ${record.id}\n`;
      formatted += `  Name: ${record.name}\n`;
      formatted += `  Value: ${record.value}\n`;
      formatted += `  Created: ${record.createdAt || 'N/A'}\n`;
      formatted += `  Last Updated: ${record.updatedAt || 'N/A'}\n`;
      formatted += '-'.repeat(40) + '\n';
    });
    
    return {
      records,
      formatted
    };
  } catch (error) {
    console.error('Error getting records for export:', error);
    return {
      records: [],
      formatted: 'Error retrieving records'
    };
  }
}

module.exports = {
  addRecord,
  listRecords,
  updateRecord,
  deleteRecord,
  searchRecords,
  sortRecords,
  getStatistics,
  getAllRecordsForExport
};
