/**
 * Parse and validate pagination query params
 * @param {object} query - Express req.query
 * @param {object} defaults
 * @returns {{ page, limit, skip, sort }}
 */
const parsePagination = (query, { defaultLimit = 20, maxLimit = 100, defaultSort = '-createdAt' } = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  const sort = query.sort || defaultSort;

  return { page, limit, skip, sort };
};

/**
 * Parse search query into MongoDB text search filter
 */
const parseSearch = (query, fields = []) => {
  if (!query || !query.trim()) return {};
  if (fields.length === 0) return { $text: { $search: query.trim() } };
  const regex = { $regex: query.trim(), $options: 'i' };
  return { $or: fields.map((f) => ({ [f]: regex })) };
};

/**
 * Build a MongoDB sort object from a string
 * e.g. '-createdAt' → { createdAt: -1 }
 *      'xp,-reputation' → { xp: 1, reputation: -1 }
 */
const buildSortObject = (sortString = '-createdAt', allowedFields = []) => {
  const sortObj = {};
  sortString.split(',').forEach((field) => {
    const direction = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');
    if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
      sortObj[fieldName] = direction;
    }
  });
  return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
};

module.exports = { parsePagination, parseSearch, buildSortObject };
