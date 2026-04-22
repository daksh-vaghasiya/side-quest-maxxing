const Notification = require('../models/Notification');
const { sendSuccess, sendPaginated } = require('../helpers/response.helper');
const { parsePagination } = require('../helpers/pagination.helper');

/**
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
    const filter = { userId: req.user._id };
    if (req.query.unread === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    return sendPaginated(res, { data: notifications, total, page, limit, message: `${unreadCount} unread` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    return sendSuccess(res, { unreadCount: count });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 */
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return sendSuccess(res, {}, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
const markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } }
    );
    return sendSuccess(res, {}, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    return sendSuccess(res, {}, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, getUnreadCount, markAllRead, markOneRead, deleteNotification };
