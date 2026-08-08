import { Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

/**
 * GET /api/admin/notifications
 * Lists all system notifications
 */
export const getNotifications = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const list = await Notification.findAll({
      include: [
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'approvedBy', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, data: list });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/admin/notifications
 * Creates a new announcement draft
 */
export const createNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { title, content, type, audience, targetUserId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and Content are required.' });
    }

    const notif = await Notification.create({
      title,
      content,
      type: type || 'ANNOUNCEMENT',
      audience: audience || 'ALL',
      targetUserId: targetUserId || null,
      status: 'DRAFT',
      createdByAdminId: req.user?.id || null
    });

    const populated = await Notification.findByPk(notif.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] }
      ]
    });

    return res.json({ success: true, data: populated });
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/admin/notifications/:id/publish
 * Approves and publishes notification draft
 */
export const publishNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByPk(id);
    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification draft not found.' });
    }

    await notif.update({
      status: 'PUBLISHED',
      publishedAt: new Date(),
      approvedByAdminId: req.user?.id || null
    });

    const populated = await Notification.findByPk(id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'approvedBy', attributes: ['firstName', 'lastName'] }
      ]
    });

    return res.json({ success: true, data: populated });
  } catch (err) {
    return next(err);
  }
};
