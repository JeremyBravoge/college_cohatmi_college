// controllers/notificationsController.js
import express from 'express';

// Try to import db, but handle if it doesn't exist
let db;
try {
  db = (await import('../config/db.js')).default;
  console.log('✅ Database module loaded');
} catch (error) {
  console.log('⚠️ Database module not found, using mock mode');
  db = null;
}

const router = express.Router();

// Helper function to map activity types to notification types
const mapActivityTypeToNotification = (activityType) => {
  const typeMap = {
    'enrollment': 'enrollment',
    'fee': 'payment',
    'attendance': 'academic',
    'result': 'academic',
    'general': 'system'
  };
  return typeMap[activityType] || 'system';
};

// Helper function to determine priority based on activity
const determinePriority = (activity) => {
  const action = activity.action?.toLowerCase() || '';
  
  if (action.includes('overdue') || 
      action.includes('failed') || 
      action.includes('critical') ||
      action.includes('emergency')) {
    return 'high';
  }
  
  if (action.includes('payment') || 
      action.includes('result') || 
      action.includes('attendance') ||
      action.includes('enrollment')) {
    return 'medium';
  }
  
  return 'low';
};

// Helper function to create notification title from activity
const createNotificationTitle = (activity) => {
  const type = activity.type || 'general';
  const action = activity.action || '';
  
  const titleMap = {
    'enrollment': action.includes('enrolled') ? 'New Enrollment' : 'Enrollment Update',
    'fee': action.includes('paid') ? 'Payment Received' : 'Payment Update',
    'attendance': action.includes('absent') ? 'Attendance Alert' : 'Attendance Update',
    'result': 'Exam Results Available',
    'general': 'System Notification'
  };
  
  return titleMap[type] || 'System Notification';
};

// Helper function to create action URL
const createActionUrl = (activity) => {
  const type = activity.type || 'general';
  const studentId = activity.student_id;
  
  const urlMap = {
    'enrollment': studentId ? `/students/${studentId}/enrollment` : '/enrollments',
    'fee': studentId ? `/finance/payments?student=${studentId}` : '/finance',
    'attendance': studentId ? `/attendance/reports?student=${studentId}` : '/attendance',
    'result': studentId ? `/academics/results?student=${studentId}` : '/results',
    'general': '/dashboard'
  };
  
  return urlMap[type] || '/dashboard';
};

// Helper function for icons
const getIconByType = (type) => {
  const icons = {
    'payment': '💰',
    'academic': '📚',
    'system': '⚙️',
    'enrollment': '📝',
    'announcement': '📢',
    'alert': '⚠️'
  };
  return icons[type] || '🔔';
};

// Helper function for time ago
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Mock notifications data
const getMockNotifications = () => {
  return [
    {
      id: 1,
      type: 'payment',
      title: 'Payment Received',
      message: 'John Doe has successfully paid Ksh 15,000 for the Web Development course',
      priority: 'medium',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      action_url: '/finance/payments',
      metadata: { amount: 15000, student: 'John Doe', course: 'Web Development' },
      icon: '💰',
      timeAgo: '5m ago'
    },
    {
      id: 2,
      type: 'academic',
      title: 'New Assignment Posted',
      message: 'Professor Smith posted a new assignment for Data Science course',
      priority: 'high',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      action_url: '/academics/assignments',
      metadata: { course: 'Data Science', dueDate: '2024-12-15' },
      icon: '📚',
      timeAgo: '30m ago'
    },
    {
      id: 3,
      type: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance this weekend from 2 AM to 6 AM',
      priority: 'low',
      read: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      action_url: '/dashboard',
      metadata: { maintenanceWindow: '2 AM - 6 AM', date: '2024-12-10' },
      icon: '⚙️',
      timeAgo: '2h ago'
    },
    {
      id: 4,
      type: 'enrollment',
      title: 'New Student Enrollment',
      message: 'Alice Johnson enrolled in the Cyber Security course',
      priority: 'medium',
      read: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      action_url: '/students/profile',
      metadata: { student: 'Alice Johnson', course: 'Cyber Security' },
      icon: '📝',
      timeAgo: '5h ago'
    },
    {
      id: 5,
      type: 'alert',
      title: 'Low Attendance Alert',
      message: 'Physics 101 has attendance below 60% for this week',
      priority: 'high',
      read: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      action_url: '/attendance/reports',
      metadata: { course: 'Physics 101', attendance: '58%' },
      icon: '⚠️',
      timeAgo: '1d ago'
    }
  ];
};

// GET /api/notifications - Get user notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.query.userId || 'STU001';
    const userType = req.query.userType || 'student';
    const { page = 1, limit = 20, read = 'all' } = req.query;
    
    console.log(`📨 Fetching notifications for ${userType}: ${userId}`);
    
    // If database is not available, use mock data
    if (!db) {
      console.log('⚠️ Using mock notifications data');
      const mockNotifications = getMockNotifications();
      
      // Apply filters to mock data
      let filteredNotifications = mockNotifications;
      
      // Filter by read status
      if (read === 'unread') {
        filteredNotifications = mockNotifications.filter(n => !n.read);
      } else if (read === 'read') {
        filteredNotifications = mockNotifications.filter(n => n.read);
      }
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + parseInt(limit));
      
      // Calculate stats
      const unreadCount = mockNotifications.filter(n => !n.read).length;
      const highPriorityCount = mockNotifications.filter(n => n.priority === 'high').length;
      const todayCount = mockNotifications.filter(n => {
        const today = new Date();
        const notificationDate = new Date(n.timestamp);
        return notificationDate.toDateString() === today.toDateString();
      }).length;
      
      return res.json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredNotifications.length,
            pages: Math.ceil(filteredNotifications.length / limit)
          },
          stats: {
            total: mockNotifications.length,
            unread: unreadCount,
            high_priority: highPriorityCount,
            today: todayCount
          }
        }
      });
    }
    
    // Database query if db is available
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.id,
        a.student_id,
        a.action,
        a.course,
        a.type as activity_type,
        a.created_at,
        COALESCE(a.notification_type, a.type) as notification_type,
        COALESCE(a.priority, 'medium') as priority,
        COALESCE(a.read_status, FALSE) as read_status,
        a.target_user_id,
        a.target_user_type,
        a.action_url,
        a.metadata
      FROM activities a
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userType === 'student') {
      query += ` AND a.student_id = ?`;
      params.push(userId);
    }
    
    if (read === 'unread') {
      query += ` AND COALESCE(a.read_status, FALSE) = FALSE`;
    } else if (read === 'read') {
      query += ` AND COALESCE(a.read_status, FALSE) = TRUE`;
    }
    
    query += `
      ORDER BY 
        CASE WHEN COALESCE(a.read_status, FALSE) = FALSE THEN 0 ELSE 1 END,
        CASE COALESCE(a.priority, 'medium')
          WHEN 'high' THEN 0 
          WHEN 'medium' THEN 1 
          WHEN 'low' THEN 2 
        END,
        a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    
    const [notifications] = await db.query(query, params);
    
    // Transform to notification format
    const transformedNotifications = notifications.map(activity => {
      const notificationType = activity.notification_type || mapActivityTypeToNotification(activity.activity_type);
      
      return {
        id: activity.id,
        title: createNotificationTitle(activity),
        message: activity.action,
        type: notificationType,
        priority: activity.priority,
        read: activity.read_status,
        timestamp: activity.created_at,
        action_url: activity.action_url || createActionUrl(activity),
        metadata: {
          student_id: activity.student_id,
          course: activity.course,
          notification_type: notificationType
        },
        icon: getIconByType(notificationType),
        timeAgo: getTimeAgo(activity.created_at)
      };
    });
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM activities a WHERE 1=1`;
    const countParams = [];
    
    if (userType === 'student') {
      countQuery += ` AND a.student_id = ?`;
      countParams.push(userId);
    }
    
    if (read === 'unread') {
      countQuery += ` AND COALESCE(a.read_status, FALSE) = FALSE`;
    } else if (read === 'read') {
      countQuery += ` AND COALESCE(a.read_status, FALSE) = TRUE`;
    }
    
    const [[{ total }]] = await db.query(countQuery, countParams);
    
    // Calculate stats from database
    const unreadCount = await getUnreadCount(userId, userType);
    const totalCount = await getTotalCount(userId, userType);
    const highPriorityCount = await getHighPriorityCount(userId, userType);
    const todayCount = await getTodayCount(userId, userType);
    
    res.json({
      success: true,
      data: {
        notifications: transformedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          total: totalCount,
          unread: unreadCount,
          high_priority: highPriorityCount,
          today: todayCount
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Fallback to mock data on error
    const mockNotifications = getMockNotifications();
    res.json({
      success: true,
      data: {
        notifications: mockNotifications.slice(0, parseInt(req.query.limit || 20)),
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 20),
          total: mockNotifications.length,
          pages: Math.ceil(mockNotifications.length / (req.query.limit || 20))
        },
        stats: {
          total: mockNotifications.length,
          unread: mockNotifications.filter(n => !n.read).length,
          high_priority: mockNotifications.filter(n => n.priority === 'high').length,
          today: mockNotifications.filter(n => {
            const today = new Date();
            const notificationDate = new Date(n.timestamp);
            return notificationDate.toDateString() === today.toDateString();
          }).length
        }
      }
    });
  }
};

// Database helper functions (with fallbacks)
const getUnreadCount = async (userId, userType) => {
  if (!db) return getMockNotifications().filter(n => !n.read).length;
  
  try {
    let query = `SELECT COUNT(*) as count FROM activities WHERE COALESCE(read_status, FALSE) = FALSE`;
    if (userType === 'student') {
      query += ` AND student_id = ?`;
      const [[{ count }]] = await db.query(query, [userId]);
      return count;
    }
    const [[{ count }]] = await db.query(query);
    return count;
  } catch {
    return getMockNotifications().filter(n => !n.read).length;
  }
};

const getTotalCount = async (userId, userType) => {
  if (!db) return getMockNotifications().length;
  
  try {
    let query = `SELECT COUNT(*) as count FROM activities`;
    if (userType === 'student') {
      query += ` WHERE student_id = ?`;
      const [[{ count }]] = await db.query(query, [userId]);
      return count;
    }
    const [[{ count }]] = await db.query(query);
    return count;
  } catch {
    return getMockNotifications().length;
  }
};

const getHighPriorityCount = async (userId, userType) => {
  if (!db) return getMockNotifications().filter(n => n.priority === 'high').length;
  
  try {
    let query = `SELECT COUNT(*) as count FROM activities WHERE COALESCE(priority, 'medium') = 'high'`;
    if (userType === 'student') {
      query += ` AND student_id = ?`;
      const [[{ count }]] = await db.query(query, [userId]);
      return count;
    }
    const [[{ count }]] = await db.query(query);
    return count;
  } catch {
    return getMockNotifications().filter(n => n.priority === 'high').length;
  }
};

const getTodayCount = async (userId, userType) => {
  if (!db) {
    return getMockNotifications().filter(n => {
      const today = new Date();
      const notificationDate = new Date(n.timestamp);
      return notificationDate.toDateString() === today.toDateString();
    }).length;
  }
  
  try {
    let query = `SELECT COUNT(*) as count FROM activities WHERE DATE(created_at) = CURDATE()`;
    if (userType === 'student') {
      query += ` AND student_id = ?`;
      const [[{ count }]] = await db.query(query, [userId]);
      return count;
    }
    const [[{ count }]] = await db.query(query);
    return count;
  } catch {
    return getMockNotifications().filter(n => {
      const today = new Date();
      const notificationDate = new Date(n.timestamp);
      return notificationDate.toDateString() === today.toDateString();
    }).length;
  }
};

// GET /api/notifications/stats - Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.query.userId || 'STU001';
    const userType = req.query.userType || 'student';
    
    const stats = {
      total: await getTotalCount(userId, userType),
      unread: await getUnreadCount(userId, userType),
      high_priority: await getHighPriorityCount(userId, userType),
      today: await getTodayCount(userId, userType)
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    const mockNotifications = getMockNotifications();
    res.json({
      success: true,
      data: {
        total: mockNotifications.length,
        unread: mockNotifications.filter(n => !n.read).length,
        high_priority: mockNotifications.filter(n => n.priority === 'high').length,
        today: mockNotifications.filter(n => {
          const today = new Date();
          const notificationDate = new Date(n.timestamp);
          return notificationDate.toDateString() === today.toDateString();
        }).length
      }
    });
  }
};

// POST /api/notifications/mark-read/:id - Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In mock mode, just return success
    if (!db) {
      return res.json({
        success: true,
        message: 'Notification marked as read (mock mode)'
      });
    }
    
    const userId = req.query.userId || 'STU001';
    
    const [result] = await db.query(
      `UPDATE activities 
       SET read_status = TRUE 
       WHERE id = ? AND student_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// POST /api/notifications/mark-all-read - Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.query.userId || 'STU001';
    
    // In mock mode, just return success
    if (!db) {
      return res.json({
        success: true,
        message: 'All notifications marked as read (mock mode)'
      });
    }
    
    await db.query(
      `UPDATE activities 
       SET read_status = TRUE 
       WHERE student_id = ? AND COALESCE(read_status, FALSE) = FALSE`,
      [userId]
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

// DELETE /api/notifications/:id - Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In mock mode, just return success
    if (!db) {
      return res.json({
        success: true,
        message: 'Notification deleted (mock mode)'
      });
    }
    
    const userId = req.query.userId || 'STU001';
    
    const [result] = await db.query(
      `DELETE FROM activities 
       WHERE id = ? AND student_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

// POST /api/notifications/create - Create a new notification (for testing)
export const createNotification = async (req, res) => {
  try {
    const {
      student_id,
      action,
      course,
      type = 'general',
      priority = 'medium'
    } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    // In mock mode, just return success
    if (!db) {
      return res.json({
        success: true,
        message: 'Notification created (mock mode)',
        data: {
          id: Math.floor(Math.random() * 1000),
          message: 'Notification created successfully'
        }
      });
    }

    const [result] = await db.query(
      `INSERT INTO activities (student_id, action, course, type)
       VALUES (?, ?, ?, ?)`,
      [student_id, action, course, type]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        message: 'Notification created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
};

// GET /api/notifications/test - Test notification endpoint
export const testNotification = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Notification system is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test notification system'
    });
  }
};

// GET /api/notifications/check-schema - Check database schema
export const checkSchema = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        success: true,
        message: 'Database not available, using mock mode',
        schema: 'mock'
      });
    }

    // Check if activities table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'activities'");
    const tableExists = tables.length > 0;

    if (!tableExists) {
      return res.json({
        success: false,
        message: 'Activities table does not exist',
        schema: 'missing'
      });
    }

    // Check table structure
    const [columns] = await db.query("DESCRIBE activities");

    res.json({
      success: true,
      message: 'Schema check completed',
      schema: {
        table: 'activities',
        exists: true,
        columns: columns.map(col => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          default: col.Default
        }))
      }
    });

  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check schema'
    });
  }
};

// POST /api/notifications/migrate - Migrate database schema
export const migrateSchema = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        success: false,
        message: 'Database not available, cannot migrate'
      });
    }

    // Create activities table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50),
        action TEXT,
        course VARCHAR(255),
        type VARCHAR(50) DEFAULT 'general',
        notification_type VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'medium',
        read_status BOOLEAN DEFAULT FALSE,
        target_user_id VARCHAR(50),
        target_user_type VARCHAR(20),
        action_url VARCHAR(255),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await db.query(createTableQuery);

    // Check if migration was successful
    const [tables] = await db.query("SHOW TABLES LIKE 'activities'");
    const success = tables.length > 0;

    res.json({
      success,
      message: success ? 'Schema migration completed successfully' : 'Schema migration failed'
    });

  } catch (error) {
    console.error('Error migrating schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate schema'
    });
  }
};

