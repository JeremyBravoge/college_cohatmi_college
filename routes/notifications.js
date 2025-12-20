// routes/notifications.js
import express from 'express';
import * as notificationController from '../controllers/notificationsController.js';

const router = express.Router();

// Use the default export if your controller exports default
router.get('/', notificationController.getNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.post('/mark-read/:id', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.post('/create', notificationController.createNotification);
router.get('/test', notificationController.testNotification);
router.get('/check-schema', notificationController.checkSchema);
router.post('/migrate', notificationController.migrateSchema);

export default router;