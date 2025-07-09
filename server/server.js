// server.js
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getReceipt } from 'checkchecker';
import loadReceipt from './checkloader.js';
import crypto from 'crypto';

const app = express();
const port = 3000;
const SECRET = process.env.JWT_SECRET || 'very-secret-key';

app.use(cors());
app.use(express.json());

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
      date TEXT NOT NULL,
      product TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
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
  const hash = await bcrypt.hash(password, 10);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const agent = req.headers['user-agent'] || 'Unknown';

  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], function (err) {
    if (err) return res.status(500).json({ error: 'Email уже используется' });
    const newUserId = this.lastID;
    db.get('SELECT * FROM users WHERE id = ?', [newUserId], (e, user) => {
      if (e || !user) return res.status(500).json({ error: 'Ошибка получения профиля' });
      const token = generateToken(user, ip, agent);
      res.json({ token });
    })
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const agent = req.headers['user-agent'] || 'Unknown';

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Пользователь не найден' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный пароль' });

    const token = generateToken(user, ip, agent);
    res.json({ token });
  });
});

// 🔐 Все маршруты ниже защищены
app.use('/api', verifyToken);

// 📦 Получение данных по чеку
app.post('/api/data', (req, res) => {
  const { date } = req.body;
  getReceipt(req.user.id, date)
    .then((data) => loadReceipt(data, date, req.user.id)
      .then((msg) => res.status(200).json({ message: msg }))
    )
    .catch(() => res.status(404).json({ message: 'Ошибка при загрузке чека' }));
});

// 📊 Получение всех записей
app.get('/api/stats', (req, res) => {
  db.all('SELECT * FROM receipts WHERE user_id = ? ORDER BY date ASC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows);
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
  db.run('INSERT INTO categories (name, user_id) VALUES (?, ?)', [name.trim(), req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.status(201).json({ id: this.lastID, name });
  });
});

app.post('/api/categories/rename', (req, res) => {
  const { oldName, newName } = req.body;
  db.run('UPDATE categories SET name = ? WHERE name = ? AND user_id = ?', [newName, oldName, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: 'Ошибка переименования' });

    db.run('UPDATE receipts SET category = ? WHERE category = ? AND user_id = ?', [newName, oldName, req.user.id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Ошибка обновления расходов' });
      res.json({ success: true });
    });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT name FROM categories WHERE id = ? AND user_id = ?', [id, req.user.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Категория не найдена' });
    const categoryName = row.name;

    db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Ошибка при удалении категории' });

      db.run('UPDATE receipts SET category = NULL WHERE category = ? AND user_id = ?', [categoryName, req.user.id], (err2) => {
        if (err2) return res.status(500).json({ error: 'Ошибка при очистке категории' });
        res.json({ message: 'Категория удалена и очищена' });
      });
    });
  });
});

// ✍️ Обновление категории записи
app.post('/api/update-category/:id', (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  db.run('UPDATE receipts SET category = ? WHERE id = ? AND user_id = ?', [category.trim(), id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка' });
    if (this.changes === 0) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ message: 'Категория обновлена' });
  });
});

// ➕ Добавление расхода вручную
app.post('/api/receipts', (req, res) => {
  const { date, product, amount, category } = req.body;

  db.run(
    'INSERT INTO receipts (date, product, amount, category, user_id) VALUES (?, ?, ?, ?, ?)',
    [date, product, amount, category || null, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      res.status(201).json({ id: this.lastID, date, product, amount, category });
    }
  );
});

// 🗑️ Удаление расхода
app.delete('/api/receipts/:id', (req, res) => {
  db.run('DELETE FROM receipts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка при удалении' });
    if (this.changes === 0) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ message: 'Удалено' });
  });
});

// 📈 График расходов по категориям
app.get('/api/expenses-by-category-range', (req, res) => {
  const { start, end } = req.query;

  db.all(
    `SELECT COALESCE(category, 'Без категории') AS category, SUM(amount) AS total
     FROM receipts
     WHERE date BETWEEN ? AND ? AND user_id = ?
     GROUP BY category
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

  db.all(
    `SELECT date, SUM(amount) AS total
     FROM receipts
     WHERE date BETWEEN ? AND ? AND user_id = ?
     GROUP BY date
     ORDER BY date ASC`,
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

  if (parseInt(id) !== req.user.id) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const updates = [];
    const params = [];
    let emailChanged = false;

    if (email && email !== user.email) {
      updates.push('email = ?');
      params.push(email);
      emailChanged = true;
    }

    if (password && password.trim()) {
      const hashed = await bcrypt.hash(password, 10);
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
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Email уже используется' });
        }
        return res.status(500).json({ error: 'Ошибка обновления' });
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

  db.get('SELECT * FROM active_tokens WHERE jti = ? AND user_id = ?', [jti, req.user.id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Сессия не найдена' });

    const now = new Date().toISOString();
    db.run('INSERT OR IGNORE INTO revoked_tokens (jti, revoked_at) VALUES (?, ?)', [jti, now]);
    db.run('DELETE FROM active_tokens WHERE jti = ?', [jti], () => {
      res.json({ message: 'Сессия завершена' });
    });
  });
});


cleanupRevokedTokens();
setInterval(cleanupRevokedTokens, 1000 * 60 * 60 * 12);

app.listen(port, () => {
  console.log(`🚀 Сервер работает на http://localhost:${port}`);
});
