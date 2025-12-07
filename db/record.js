function validateRecord(record) {
  if (!record.name || typeof record.name !== 'string' || record.name.trim() === '') {
    throw new Error('Name is required and must be a non-empty string');
  }
  if (!record.value || typeof record.value !== 'string' || record.value.trim() === '') {
    throw new Error('Value is required and must be a non-empty string');
  }
}

module.exports = {
  validateRecord
};
