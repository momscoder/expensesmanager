import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getReceipt } from 'checkchecker';
import loadReceipt, { receiptExists } from './checkloader.js';
import crypto from 'crypto';

const app = express(); 
const port = 3000;
const SECRET = process.env.JWT_SECRET || 'very-secret-key';

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit request size

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});

// Simple rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window

app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimit.has(clientIP)) {
    rateLimit.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = rateLimit.get(clientIP);
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      clientData.count++;
    }
    
    if (clientData.count > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
  }
  
  next();
});

// Input validation and sanitization functions
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
};

const sanitizeNumber = (num) => {
  const parsed = parseInt(num, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const sanitizeFloat = (num) => {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? 0 : parsed;
};

const validateDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
};

const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validation functions
const validateLogin = (login) => {
  if (!login || typeof login !== 'string') return false;
  const loginRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return loginRegex.test(login.trim());
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 5 && password.length <= 100; // Add upper limit
};

// Check if username already exists
const checkUsernameExists = (username, excludeUserId = null) => {
  return new Promise((resolve, reject) => {
    if (!validateLogin(username)) {
      reject(new Error('Invalid username format'));
      return;
    }
    
    let query = 'SELECT id FROM users WHERE email = ?';
    let params = [username];
    
    if (excludeUserId) {
      const sanitizedId = sanitizeNumber(excludeUserId);
      if (sanitizedId <= 0) {
        reject(new Error('Invalid user ID'));
        return;
      }
      query += ' AND id != ?';
      params.push(sanitizedId);
    }
    
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row); // Returns true if username exists, false otherwise
      }
    });
  });
};

// Централизованный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack); // Логирование ошибки
  
  // Don't expose internal errors to client
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? err.message : 'Внутренняя ошибка сервера';
  
  res.status(err.status || 500).json({ 
    error: message,
    ...(isDevelopment && { stack: err.stack })
  });
});

// 📦 Подключение к SQLite
const db = new sqlite3.Database('./receipts.db', (err) => {
  if (err) console.error('Ошибка при подключении:', err.message);
  else console.log('✅ Подключено к базе данных SQLite');
});

// 🧱 Инициализация таблиц
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      token_version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT,
      date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      hash TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS used_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_hash TEXT UNIQUE NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti TEXT PRIMARY KEY,
      revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

  db.run(`
      CREATE TABLE IF NOT EXISTS active_tokens (
      jti TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ip TEXT,
      user_agent TEXT,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

});

// 🔐 JWT middleware
function generateToken(user, ip, agent) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { id: user.id, email: user.email, token_version: user.token_version, jti },
    SECRET,
    { expiresIn: '7d' }
  );

  db.run(
    'INSERT INTO active_tokens (jti, user_id, ip, user_agent) VALUES (?, ?, ?, ?)',
    [jti, user.id, ip, agent],
    (err) => {
      if (err) console.error('❌ Не удалось сохранить active_token:', err.message);
    }
  );

  return token;
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });

  try {
    const payload = jwt.verify(token, SECRET);
    const { id, token_version, jti } = payload;

    db.get('SELECT token_version FROM users WHERE id = ?', [id], (err, row) => {
      if (err || !row) return res.status(401).json({ error: 'Неверный токен' });
      if (row.token_version !== token_version) {
        return res.status(401).json({ error: 'Токен устарел' });

      }

      db.get('SELECT 1 FROM revoked_tokens WHERE jti = ?', [jti], (err2, revoked) => {
        if (err2) return res.status(500).json({ error: 'Ошибка проверки токена' });
        if (revoked) return res.status(401).json({ error: 'Токен отозван' });

        db.get('SELECT 1 FROM active_tokens WHERE jti = ?', [jti], (err3, active) => {
          if (err3) return res.status(500).json({ error: 'Ошибка проверки токена' });
          if (!active) return res.status(401).json({ error: 'Сессия неактивна' });

          req.user = payload;
          next();
        });
      });
    });
  } catch {
    return res.status(401).json({ error: 'Неверный токен' });
  }
}


function cleanupRevokedTokens() {
  db.run(
    `DELETE FROM revoked_tokens WHERE revoked_at <= datetime('now', '-7 days')`,
    (err) => {
      if (err) console.error('❌ Ошибка автоочистки revoked_tokens:', err.message);
      else console.log('🧽 Удалены устаревшие revoked_tokens');
    }
  );
}

// 🧾 Авторизация
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeString(email);
  const sanitizedPassword = sanitizeString(password);
  
  // Validate login
  if (!validateLogin(sanitizedEmail)) {
    return res.status(400).json({ error: 'Логин должен содержать 3-20 символов (буквы, цифры, _ или -)' });
  }
  
  // Validate password
  if (!validatePassword(sanitizedPassword)) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 5 символов' });
  }
  
  try {
    // Check for duplicate username
    const usernameExists = await checkUsernameExists(sanitizedEmail);
    if (usernameExists) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }
    
    const hash = await bcrypt.hash(sanitizedPassword, 10);
    const ip = sanitizeString(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    const agent = sanitizeString(req.headers['user-agent'] || 'Unknown');

    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [sanitizedEmail, hash], function (err) {
      if (err) {
        console.error('Database error during registration:', err);
        return res.status(500).json({ error: 'Ошибка при создании аккаунта' });
      }
    const newUserId = this.lastID;
    db.get('SELECT * FROM users WHERE id = ?', [newUserId], (e, user) => {
      if (e || !user) return res.status(500).json({ error: 'Ошибка получения профиля' });
      const token = generateToken(user, ip, agent);
      res.json({ token });
      });
  });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Sanitize inputs
  const sanitizedEmail = sanitizeString(email);
  const sanitizedPassword = sanitizeString(password);
  
  // Validate inputs
  if (!validateLogin(sanitizedEmail)) {
    return res.status(400).json({ error: 'Неверный формат логина' });
  }
  
  if (!validatePassword(sanitizedPassword)) {
    return res.status(400).json({ error: 'Неверный формат пароля' });
  }
  
  const ip = sanitizeString(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
  const agent = sanitizeString(req.headers['user-agent'] || 'Unknown');

  db.get('SELECT * FROM users WHERE email = ?', [sanitizedEmail], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Пользователь не найден' });
    const valid = await bcrypt.compare(sanitizedPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный пароль' });

    const token = generateToken(user, ip, agent);
    res.json({ token });
  });
});

// 🔐 Все маршруты ниже защищены
app.use('/api', verifyToken);

// 📦 Получение данных по чеку
app.post('/api/data', async (req, res) => {
  const { uid, date } = req?.body;
  const userId = req?.user?.id;
  if(uid === undefined || date === undefined || userId === undefined) {
    return res.status(400).json({message : `Invalid data`});
  }

  // костыль, потом сделать опцию форсированной загрузки
  if (await receiptExists(db, userId, uid, date)) {
    return res.status(409).json({message : `Чек уже обработан`});
  }

  getReceipt(uid, date)
    .then((data) => loadReceipt(db, userId, data, date, uid)
      .then((code) =>  {
          if(isNaN(code)) code = 0;
          const statusVary = [400, 409, 200];
          const messageVary = ['Не удалось получить чек', 'Чек уже обработан', 'Данные успешно сохранены'];
          res.status(statusVary[code]).json({ message: messageVary[code] })
      })
    )
    .catch(() => res.status(404).json({ message: 'Ошибка при загрузке чека' }));
});

// 📊 Получение всех записей
app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT 
      r.id,
      r.uid,
      r.date,
      r.total_amount,
      r.hash,
      r.created_at,
      json_group_array(
        json_object(
          'id', p.id,
          'name', p.name,
          'amount', p.amount,
          'category', p.category
        )
      ) as purchases
    FROM receipts r
    LEFT JOIN purchases p ON r.id = p.receipt_id
    WHERE r.user_id = ?
    GROUP BY r.id
    ORDER BY r.date DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    
    // Parse purchases JSON for each receipt
    const receipts = rows.map(row => ({
      ...row,
      purchases: JSON.parse(row.purchases).filter(p => p.id !== null) // Remove null entries
    }));
    
    res.json(receipts);
  });
});

// 🧾 Категории
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  
  // Sanitize and validate category name
  const sanitizedName = sanitizeString(name);
  if (!sanitizedName || !sanitizedName.trim() || sanitizedName.length > 50) {
    return res.status(400).json({ error: 'Название категории обязательно и не должно превышать 50 символов' });
  }

  db.run('INSERT INTO categories (name, user_id) VALUES (?, ?)', [sanitizedName.trim(), req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.status(201).json({ id: this.lastID, name: sanitizedName.trim() });
  });
});

app.post('/api/categories/rename', (req, res) => {
  const { oldName, newName } = req.body;
  
  // Sanitize and validate category names
  const sanitizedOldName = sanitizeString(oldName);
  const sanitizedNewName = sanitizeString(newName);
  
  if (!sanitizedOldName || !sanitizedNewName || 
      !sanitizedOldName.trim() || !sanitizedNewName.trim() || 
      sanitizedNewName.length > 50) {
    return res.status(400).json({ error: 'Названия категорий обязательны и не должны превышать 50 символов' });
  }

  db.run('UPDATE categories SET name = ? WHERE name = ? AND user_id = ?', [sanitizedNewName.trim(), sanitizedOldName.trim(), req.user.id], (err) => {
    if (err) return res.status(500).json({ error: 'Ошибка переименования' });

    db.run(`
      UPDATE purchases 
      SET category = ? 
      WHERE category = ? AND receipt_id IN (
        SELECT id FROM receipts WHERE user_id = ?
      )
    `, [sanitizedNewName.trim(), sanitizedOldName.trim(), req.user.id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Ошибка обновления покупок' });
      res.json({ success: true });
    });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  // Sanitize and validate category ID
  const sanitizedId = sanitizeNumber(id);
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID категории' });
  }

  db.get('SELECT name FROM categories WHERE id = ? AND user_id = ?', [sanitizedId, req.user.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Категория не найдена' });
    const categoryName = row.name;

    db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [sanitizedId, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Ошибка при удалении категории' });

      db.run(`
        UPDATE purchases 
        SET category = NULL 
        WHERE category = ? AND receipt_id IN (
          SELECT id FROM receipts WHERE user_id = ?
        )
      `, [categoryName, req.user.id], (err2) => {
        if (err2) return res.status(500).json({ error: 'Ошибка при очистке категории' });
        res.json({ message: 'Категория удалена и очищена' });
      });
    });
  });
});

// ✍️ Обновление категории покупки
app.post('/api/update-category/:id', (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  // Sanitize and validate inputs
  const sanitizedId = sanitizeNumber(id);
  const sanitizedCategory = category ? sanitizeString(category) : null;
  
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID покупки' });
  }
  
  if (sanitizedCategory && sanitizedCategory.length > 50) {
    return res.status(400).json({ error: 'Название категории не должно превышать 50 символов' });
  }

  db.run(`
    UPDATE purchases 
    SET category = ? 
    WHERE id = ? AND receipt_id IN (
      SELECT id FROM receipts WHERE user_id = ?
    )
  `, [sanitizedCategory ? sanitizedCategory.trim() : null, sanitizedId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка' });
    if (this.changes === 0) return res.status(404).json({ error: 'Покупка не найдена' });
    res.json({ message: 'Категория обновлена' });
  });
});

// ✍️ Обновление названия покупки
app.post('/api/update-purchase/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // Sanitize and validate inputs
  const sanitizedId = sanitizeNumber(id);
  const sanitizedName = sanitizeString(name);
  
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID покупки' });
  }
  
  if (!sanitizedName || !sanitizedName.trim() || sanitizedName.length > 200) {
    return res.status(400).json({ error: 'Название покупки обязательно и не должно превышать 200 символов' });
  }

  db.run(`
    UPDATE purchases 
    SET name = ? 
    WHERE id = ? AND receipt_id IN (
      SELECT id FROM receipts WHERE user_id = ?
    )
  `, [sanitizedName.trim(), sanitizedId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка' });
    if (this.changes === 0) return res.status(404).json({ error: 'Покупка не найдена' });
    res.json({ message: 'Название обновлено' });
  });
});

// ✍️ Обновление цены покупки
app.post('/api/update-purchase-price/:id', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  // Sanitize and validate inputs
  const sanitizedId = sanitizeNumber(id);
  const sanitizedAmount = sanitizeFloat(amount);
  
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID покупки' });
  }
  
  if (sanitizedAmount <= 0 || sanitizedAmount > 999999.99) {
    return res.status(400).json({ error: 'Сумма должна быть больше 0 и меньше 1,000,000' });
  }

  // First get the purchase to update receipt total
  db.get(`
    SELECT p.*, r.id as receipt_id
    FROM purchases p
    JOIN receipts r ON p.receipt_id = r.id
    WHERE p.id = ? AND r.user_id = ?
  `, [sanitizedId, req.user.id], (err, purchase) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении покупки' });
    if (!purchase) return res.status(404).json({ error: 'Покупка не найдена' });

    // Update purchase amount
    db.run(`
      UPDATE purchases 
      SET amount = ? 
      WHERE id = ? AND receipt_id IN (
        SELECT id FROM receipts WHERE user_id = ?
      )
    `, [sanitizedAmount, sanitizedId, req.user.id], function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка' });
      if (this.changes === 0) return res.status(404).json({ error: 'Покупка не найдена' });
      
      // Update receipt total amount
      db.run(`
        UPDATE receipts 
        SET total_amount = (
          SELECT COALESCE(SUM(amount), 0) 
          FROM purchases 
          WHERE receipt_id = ?
        )
        WHERE id = ? AND user_id = ?
      `, [purchase.receipt_id, purchase.receipt_id, req.user.id], (err) => {
        if (err) console.error('Error updating receipt total:', err);
        res.json({ message: 'Цена обновлена' });
      });
    });
  });
});

// ✍️ Обновление даты чека
app.post('/api/update-receipt-date/:id', (req, res) => {
  const { id } = req.params;
  const { date } = req.body;

  // Sanitize and validate inputs
  const sanitizedId = sanitizeNumber(id);
  const sanitizedDate = sanitizeString(date);
  
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID чека' });
  }
  
  if (!validateDate(sanitizedDate)) {
    return res.status(400).json({ error: 'Неверный формат даты (YYYY-MM-DD)' });
  }

  db.run(`
    UPDATE receipts 
    SET date = ? 
    WHERE id = ? AND user_id = ?
  `, [sanitizedDate, sanitizedId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка' });
    if (this.changes === 0) return res.status(404).json({ error: 'Чек не найден' });
    res.json({ message: 'Дата обновлена' });
  });
});

// ✍️ Обновление названия чека (UID)
app.post('/api/update-receipt-name/:id', (req, res) => {
  const { id } = req.params;
  const { uid } = req.body;

  // Sanitize and validate inputs
  const sanitizedId = sanitizeNumber(id);
  const sanitizedUid = uid ? sanitizeString(uid) : null;
  
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID чека' });
  }
  
  if (sanitizedUid && sanitizedUid.length > 100) {
    return res.status(400).json({ error: 'Название чека не должно превышать 100 символов' });
  }

  db.run(`
    UPDATE receipts 
    SET uid = ? 
    WHERE id = ? AND user_id = ?
  `, [sanitizedUid ? sanitizedUid.trim() : null, sanitizedId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка' });
    if (this.changes === 0) return res.status(404).json({ error: 'Чек не найден' });
    res.json({ message: 'Название чека обновлено' });
  });
});

// 🗑️ Удаление покупки
app.delete('/api/purchases/:id', (req, res) => {
  const { id } = req.params;
  
  // Sanitize and validate purchase ID
  const sanitizedId = sanitizeNumber(id);
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID покупки' });
  }
  
  // First get the purchase to check if it's the last one in the receipt
  db.get(`
    SELECT p.*, r.id as receipt_id, 
           (SELECT COUNT(*) FROM purchases WHERE receipt_id = r.id) as purchase_count
    FROM purchases p
    JOIN receipts r ON p.receipt_id = r.id
    WHERE p.id = ? AND r.user_id = ?
  `, [sanitizedId, req.user.id], (err, purchase) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении покупки' });
    if (!purchase) return res.status(404).json({ error: 'Покупка не найдена' });
    
    // If this is the last purchase in the receipt, delete the entire receipt
    if (purchase.purchase_count <= 1) {
      db.run('DELETE FROM receipts WHERE id = ? AND user_id = ?', [purchase.receipt_id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: 'Ошибка при удалении чека' });
        res.json({ message: 'Чек удален (последняя покупка)', deletedReceipt: true });
      });
    } else {
      // Delete only the purchase
      db.run(`
        DELETE FROM purchases 
        WHERE id = ? AND receipt_id IN (
          SELECT id FROM receipts WHERE user_id = ?
        )
      `, [sanitizedId, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: 'Ошибка при удалении покупки' });
        if (this.changes === 0) return res.status(404).json({ error: 'Покупка не найдена' });
        
        // Update receipt total amount
        db.run(`
          UPDATE receipts 
          SET total_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM purchases 
            WHERE receipt_id = ?
          )
          WHERE id = ? AND user_id = ?
        `, [purchase.receipt_id, purchase.receipt_id, req.user.id], (err) => {
          if (err) console.error('Error updating receipt total:', err);
          res.json({ message: 'Покупка удалена', deletedReceipt: false });
        });
      });
    }
  });
});

// ➕ Добавление расхода вручную
app.post('/api/receipts', (req, res) => {
  const { uid, date, purchases, total_amount } = req.body;
  
  // Sanitize and validate inputs
  const sanitizedUid = uid ? sanitizeString(uid) : null;
  const sanitizedDate = sanitizeString(date);
  const sanitizedTotalAmount = sanitizeFloat(total_amount);
  
  // Validate required fields
  if (!validateDate(sanitizedDate)) {
    return res.status(400).json({ error: 'Неверный формат даты (YYYY-MM-DD)' });
  }
  
  if (!Array.isArray(purchases) || purchases.length === 0) {
    return res.status(400).json({ error: 'Список покупок обязателен и не должен быть пустым' });
  }
  
  if (sanitizedTotalAmount <= 0 || sanitizedTotalAmount > 999999.99) {
    return res.status(400).json({ error: 'Сумма должна быть больше 0 и меньше 1,000,000' });
  }

  // Validate each purchase
  for (const purchase of purchases) {
    const { name, amount, category } = purchase;
    const sanitizedName = sanitizeString(name);
    const sanitizedAmount = sanitizeFloat(amount);
    const sanitizedCategory = category ? sanitizeString(category) : null;
    
    if (!sanitizedName || !sanitizedName.trim() || sanitizedName.length > 200) {
      return res.status(400).json({ error: 'Название продукта обязательно и не должно превышать 200 символов' });
    }
    
    if (sanitizedAmount <= 0 || sanitizedAmount > 999999.99) {
      return res.status(400).json({ error: 'Сумма покупки должна быть больше 0 и меньше 1,000,000' });
    }
    
    if (sanitizedCategory && sanitizedCategory.length > 50) {
      return res.status(400).json({ error: 'Название категории не должно превышать 50 символов' });
    }
  }

  // Generate hash for the receipt
  const receiptHash = crypto.createHash('sha256')
    .update(`${sanitizedUid || ''}${sanitizedDate}${sanitizedTotalAmount}${req.user.id}`)
    .digest('hex');

  db.run(
    'INSERT INTO receipts (uid, date, total_amount, hash, user_id) VALUES (?, ?, ?, ?, ?)',
    [sanitizedUid, sanitizedDate, sanitizedTotalAmount, receiptHash, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      
      const receiptId = this.lastID;
      
      // Insert purchases
      const purchaseStmt = db.prepare('INSERT INTO purchases (receipt_id, name, amount, category) VALUES (?, ?, ?, ?)');
      
      purchases.forEach(purchase => {
        const { name, amount, category } = purchase;
        const sanitizedName = sanitizeString(name);
        const sanitizedAmount = sanitizeFloat(amount);
        const sanitizedCategory = category ? sanitizeString(category) : null;
        
        purchaseStmt.run([receiptId, sanitizedName.trim(), sanitizedAmount, sanitizedCategory ? sanitizedCategory.trim() : null]);
      });
      
      purchaseStmt.finalize((err) => {
        if (err) return res.status(500).json({ error: 'Ошибка сохранения покупок' });
        
        res.status(201).json({ 
          id: receiptId,
          uid: sanitizedUid,
          date: sanitizedDate,
          total_amount: sanitizedTotalAmount,
          purchases: purchases
        });
      });
    }
  );
});

// 🗑️ Удаление расхода
app.delete('/api/receipts/:id', (req, res) => {
  const { id } = req.params;
  
  // Sanitize and validate receipt ID
  const sanitizedId = sanitizeNumber(id);
  if (sanitizedId <= 0) {
    return res.status(400).json({ error: 'Неверный ID записи' });
  }
  
  db.run('DELETE FROM receipts WHERE id = ? AND user_id = ?', [sanitizedId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка при удалении' });
    if (this.changes === 0) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ message: 'Удалено' });
  });
});

// 📈 График расходов по категориям
app.get('/api/expenses-by-category-range', (req, res) => {
  const { start, end } = req.query;
  
  // Validate date parameters
  if (!validateDate(start) || !validateDate(end)) {
    return res.status(400).json({ error: 'Неверный формат даты (YYYY-MM-DD)' });
  }
  
  // Ensure start date is before end date
  if (start > end) {
    return res.status(400).json({ error: 'Начальная дата должна быть раньше конечной' });
  }

  db.all(
    `SELECT COALESCE(p.category, 'Без категории') AS category, SUM(p.amount) AS total
     FROM receipts r
     JOIN purchases p ON r.id = p.receipt_id
     WHERE r.date BETWEEN ? AND ? AND r.user_id = ?
     GROUP BY p.category
     ORDER BY total DESC`,
    [start, end, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      res.json(rows);
    }
  );
});

app.get('/api/total-expenses-range', (req, res) => {
  const { start, end } = req.query;
  
  // Validate date parameters
  if (!validateDate(start) || !validateDate(end)) {
    return res.status(400).json({ error: 'Неверный формат даты (YYYY-MM-DD)' });
  }
  
  // Ensure start date is before end date
  if (start > end) {
    return res.status(400).json({ error: 'Начальная дата должна быть раньше конечной' });
  }

  db.all(
    `SELECT r.date, SUM(p.amount) AS total
     FROM receipts r
     JOIN purchases p ON r.id = p.receipt_id
     WHERE r.date BETWEEN ? AND ? AND r.user_id = ?
     GROUP BY r.date
     ORDER BY r.date ASC`,
    [start, end, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      res.json(rows);
    }
  );
});

app.patch('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  // Sanitize and validate user ID
  const sanitizedId = sanitizeNumber(id);
  if (sanitizedId !== req.user.id) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  // Sanitize inputs
  const sanitizedEmail = email ? sanitizeString(email) : null;
  const sanitizedPassword = password ? sanitizeString(password) : null;

  // Validate login if provided
  if (sanitizedEmail && !validateLogin(sanitizedEmail)) {
    return res.status(400).json({ error: 'Логин должен содержать 3-20 символов (буквы, цифры, _ или -)' });
  }

  // Validate password if provided
  if (sanitizedPassword && sanitizedPassword.trim() && !validatePassword(sanitizedPassword)) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 5 символов' });
  }

  // Check for duplicate username
  if (sanitizedEmail && sanitizedEmail !== req.user.email) { // Only check if email is being changed
    try {
      const usernameExists = await checkUsernameExists(sanitizedEmail, req.user.id);
      if (usernameExists) {
        return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      }
    } catch (error) {
      console.error('Error checking username:', error);
      return res.status(500).json({ error: 'Ошибка проверки логина' });
    }
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const updates = [];
    const params = [];
    let emailChanged = false;

    if (sanitizedEmail && sanitizedEmail !== user.email) {
      updates.push('email = ?');
      params.push(sanitizedEmail);
      emailChanged = true;
    }

    if (sanitizedPassword && sanitizedPassword.trim()) {
      const hashed = await bcrypt.hash(sanitizedPassword, 10);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (updates.length === 0) {
      return res.json({ message: 'Нечего обновлять' });
    }

    updates.push('token_version = token_version + 1');
    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function (err) {
      if (err) {
        console.error('Database error during user update:', err);
        return res.status(500).json({ error: 'Ошибка обновления профиля' });
      }

      db.get('SELECT * FROM users WHERE id = ?', [id], (e, freshUser) => {
        if (e || !freshUser) return res.status(500).json({ error: 'Ошибка чтения профиля' });

        const now = new Date().toISOString();
        db.all('SELECT jti FROM active_tokens WHERE user_id = ?', [freshUser.id], (err, rows) => {
          const stmtRevoke = db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, revoked_at) VALUES (?, ?)');
          const stmtDelete = db.prepare('DELETE FROM active_tokens WHERE jti = ?');

          rows.forEach(({ jti }) => {
            stmtRevoke.run(jti, now);
            stmtDelete.run(jti);
          });

          stmtRevoke.finalize();
          stmtDelete.finalize();

          const jti = crypto.randomUUID();
          const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
          const userAgent = req.headers['user-agent'] || 'Unknown';

          const newToken = jwt.sign(
            {
              id: freshUser.id,
              email: freshUser.email,
              token_version: freshUser.token_version,
              jti
            },
            SECRET,
            { expiresIn: '7d' }
          );

          db.run(
            'INSERT INTO active_tokens (jti, user_id, ip, user_agent) VALUES (?, ?, ?, ?)',
            [jti, freshUser.id, ip, userAgent],
            (err2) => {
              if (err2) console.error('❌ Ошибка записи active_token:', err2.message);
              res.json({ message: 'Профиль обновлён', token: newToken });
            }
          );
        });
      });
    });
  });
});


app.post('/api/logout', verifyToken, (req, res) => {
  const { jti } = req.user;
  
  // Validate JTI format
  if (!validateUUID(jti)) {
    return res.status(400).json({ error: 'Неверный формат токена' });
  }
  
  db.run('INSERT INTO revoked_tokens (jti) VALUES (?)', [jti]);
  db.run('DELETE FROM active_tokens WHERE jti = ?', [jti]);
  res.json({ message: 'Выход выполнен' });
});

app.post('/api/logout-all', verifyToken, (req, res) => {
  db.all('SELECT jti FROM active_tokens WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка' });

    const now = new Date().toISOString();
    const stmtRevoke = db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, revoked_at) VALUES (?, ?)');
    const stmtDelete = db.prepare('DELETE FROM active_tokens WHERE jti = ?');

    rows.forEach(({ jti }) => {
      stmtRevoke.run(jti, now);
      stmtDelete.run(jti);
    });

    stmtRevoke.finalize();
    stmtDelete.finalize();

    res.json({ message: `Завершено ${rows.length} сессий` });
  });
});

app.get('/api/sessions', verifyToken, (req, res) => {
  db.all(
    `SELECT jti, ip, user_agent, issued_at
     FROM active_tokens
     WHERE user_id = ?
     ORDER BY issued_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Ошибка получения сессий' });
      res.json(rows);
    }
  );
});

app.delete('/api/sessions/:jti', verifyToken, (req, res) => {
  const { jti } = req.params;
  
  // Validate JTI format
  if (!validateUUID(jti)) {
    return res.status(400).json({ error: 'Неверный формат токена сессии' });
  }

  db.get('SELECT * FROM active_tokens WHERE jti = ? AND user_id = ?', [jti, req.user.id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Сессия не найдена' });

    const now = new Date().toISOString();
    db.run('INSERT OR IGNORE INTO revoked_tokens (jti, revoked_at) VALUES (?, ?)', [jti, now]);
    db.run('DELETE FROM active_tokens WHERE jti = ?', [jti], () => {
      res.json({ message: 'Сессия завершена' });
    });
  });
});

// 📥 Получение всех данных пользователя для синхронизации
app.get('/api/pull', async (req, res) => {
  try {
    // Получить все чеки пользователя
    const receipts = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM receipts WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Получить все покупки пользователя
    const purchases = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM purchases WHERE receipt_id IN (SELECT id FROM receipts WHERE user_id = ?)', [req.user.id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Получить все категории пользователя
    const categories = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM categories WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    res.json({ receipts, purchases, categories });
  } catch (error) {
    console.error('Ошибка при pull:', error);
    res.status(500).json({ error: 'Ошибка сервера при pull' });
  }
});

// 🔄 Новый endpoint синхронизации
app.post('/api/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { receipts = [], purchases = [], categories = [] } = req.body;
    const results = { receipts: [], purchases: [], categories: [] };
    const hashToServerId = {};
    const localIdToServerId = {};

    // 1. Синхронизация чеков
    for (const r of receipts) {
      let serverReceipt = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM receipts WHERE hash = ? AND user_id = ?', [r.hash, userId], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      let receiptId;
      if (serverReceipt) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE receipts SET uid = ?, date = ?, total_amount = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
            [r.uid, r.date, r.total_amount, r.updated_at, serverReceipt.id, userId],
            function (err) {
              if (err) return reject(err);
              results.receipts.push({ id: serverReceipt.id, status: 'updated', hash: r.hash, localId: r.localId });
              hashToServerId[r.hash] = serverReceipt.id;
              if (r.localId) localIdToServerId[r.localId] = serverReceipt.id;
              resolve();
            }
          );
        });
        receiptId = serverReceipt.id;
      } else {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO receipts (uid, date, total_amount, hash, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [r.uid, r.date, r.total_amount, r.hash, r.created_at, r.updated_at, userId],
            function (err) {
              if (err) return reject(err);
              results.receipts.push({ id: this.lastID, status: 'created', hash: r.hash, localId: r.localId });
              hashToServerId[r.hash] = this.lastID;
              if (r.localId) localIdToServerId[r.localId] = this.lastID;
              receiptId = this.lastID;
              resolve();
            }
          );
        });
      }
      // После обновления/вставки чека — удаляем все покупки этого чека
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM purchases WHERE receipt_id = ?', [receiptId], function (err) {
          if (err) return reject(err);
          resolve();
        });
      });
      // Вставляем все покупки из payload для этого чека
      // ВАЖНО: ищем покупки по локальному id (r.id) и по серверному (receiptId) и по localIdToServerId[r.id]
      const purchasesForReceipt = purchases.filter(
        p => p.receipt_id === r.id || p.receipt_id === receiptId || p.receipt_id === localIdToServerId[r.id]
      );
      for (const p of purchasesForReceipt) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO purchases (name, amount, category, receipt_id) VALUES (?, ?, ?, ?)`,
            [p.name, p.amount, p.category, receiptId],
            function (err) {
              if (err) return reject(err);
              results.purchases.push({ id: this.lastID, status: 'created', localId: p.localId });
              resolve();
            }
          );
        });
      }
    }

    // 2. Синхронизация категорий (по name + user_id)
    for (const c of categories) {
      const serverCategory = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM categories WHERE name = ? AND user_id = ?', [c.name, userId], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      if (serverCategory) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE categories SET name = ? WHERE id = ? AND user_id = ?`,
            [c.name, serverCategory.id, userId],
            function (err) {
              if (err) return reject(err);
              results.categories.push({ id: serverCategory.id, status: 'updated', localId: c.localId });
              resolve();
            }
          );
        });
      } else {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO categories (name, user_id) VALUES (?, ?)`,
            [c.name, userId],
            function (err) {
              if (err) return reject(err);
              results.categories.push({ id: this.lastID, status: 'created', localId: c.localId });
              resolve();
            }
          );
        });
      }
    }

    res.json({ success: true, results, localIdToServerId, hashToServerId });
    console.log('sync', results);
  } catch (error) {
    console.error('Ошибка при sync:', error);
    res.status(500).json({ error: 'Ошибка сервера при sync' });
  }
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

cleanupRevokedTokens();
setInterval(cleanupRevokedTokens, 1000 * 60 * 60 * 12);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Сервер работает на http://0.0.0.0:${port}`);
});
