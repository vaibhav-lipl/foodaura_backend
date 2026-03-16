/**
 * Sanitize and validate query parameters
 * Handles empty strings, null, undefined, and whitespace
 */

/**
 * Check if a value is valid (not empty, null, undefined, or whitespace)
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is valid
 */
const isValidValue = (value) => {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  return true;
};

/**
 * Sanitize string value - trim and return null if empty
 * @param {any} value - Value to sanitize
 * @returns {string|null} - Sanitized value or null
 */
const sanitizeString = (value) => {
  if (!isValidValue(value)) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

/**
 * Sanitize boolean value from query string
 * @param {any} value - Value to sanitize
 * @returns {boolean|null} - Boolean value or null
 */
const sanitizeBoolean = (value) => {
  if (!isValidValue(value)) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') {
      return true;
    }
    if (trimmed === 'false' || trimmed === '0') {
      return false;
    }
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
};

/**
 * Sanitize number value
 * @param {any} value - Value to sanitize
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Number value or default
 */
const sanitizeNumber = (value, defaultValue = null) => {
  if (!isValidValue(value)) {
    return defaultValue;
  }
  const num = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return num;
};

/**
 * Sanitize date value
 * @param {any} value - Value to sanitize
 * @returns {Date|null} - Date object or null
 */
const sanitizeDate = (value) => {
  if (!isValidValue(value)) {
    return null;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

/**
 * Build where clause for filters
 * Only adds conditions for valid (non-empty) values
 * @param {object} filters - Filter object
 * @returns {object} - Sequelize where clause
 */
const buildWhereClause = (filters) => {
  const whereClause = {};
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    
    // Skip if value is invalid
    if (!isValidValue(value)) {
      return;
    }
    
    // Handle different value types
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        whereClause[key] = trimmed;
      }
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      whereClause[key] = value;
    } else if (value !== null && value !== undefined) {
      whereClause[key] = value;
    }
  });
  
  return whereClause;
};

module.exports = {
  isValidValue,
  sanitizeString,
  sanitizeBoolean,
  sanitizeNumber,
  sanitizeDate,
  buildWhereClause
};

