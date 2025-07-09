import { getReceipt } from "checkchecker"
import loadReceipt from "./checkloader.js"

import express from 'express'
import cors from 'cors'

import sqlite3 from 'sqlite3';

const app = express();
const port = 3000; // Choose a different port than your Vite app

app.use(cors()); // Enable CORS for all origins (for local development)
app.use(express.json()); // Enable JSON body parsing

const db = new sqlite3.Database('./receipts.db', (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы:', err.message);
        } else {
            console.log('Таблица categories готова');
        }
    });
});

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT
    );
  `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы:', err.message);
        } else {
            console.log('Таблица receipts готова');
        }
    });
});

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS used_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_hash TEXT UNIQUE NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы:', err.message);
        } else {
            console.log('Таблица used_receipts готова');
        }
    });
});

app.post('/api/data', (req, res) => {
    const receivedData = req.body;
    console.log('Received data:', receivedData);

    try { //'yyyy-mm-dd'
        getReceipt(receivedData.ui, receivedData.date)
            .then((data) => loadReceipt(data, receivedData.date, receivedData.ui)
                .then((mes) => {
                    res.status(200).json({ message: mes })
                })
            )
    } catch (error) {
        res.status(404).json({ message: 'ERROR' });
    }
});

app.get('/api/stats', async (req, res) => {
    db.all('SELECT * FROM receipts ORDER BY date ASC', [], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении категорий:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(rows);
    });
});

app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении категорий:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Название категории обязательно' });
    }

    const query = 'INSERT INTO categories (name) VALUES (?)';
    db.run(query, [name.trim()], function (err) {
        if (err) {
            console.error('Ошибка при добавлении категории:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        res.status(201).json({ id: this.lastID, name: name.trim() });
    });
});

app.post('/api/update-category/:id', (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!category || category.trim() === '') {
    return res.status(400).json({ error: 'Категория не может быть пустой' });
  }

  const query = 'UPDATE receipts SET category = ? WHERE id = ?';
  db.run(query, [category.trim(), id], function (err) {
    if (err) {
      console.error('Ошибка при обновлении категории:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ message: 'Категория обновлена', id, category: category.trim() });
  });
});

app.get('/api/expenses-by-category-range', (req, res) => {
  const { start, end } = req.query;
  const query = `
    SELECT 
      COALESCE(category, 'Без категории') AS category,
      SUM(amount) AS total
    FROM receipts
    WHERE date BETWEEN ? AND ?
    GROUP BY category
  `;

  db.all(query, [start, end], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении данных для графика:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.json(rows);
  });
});

app.post('/api/receipts', (req, res) => {
  const { date, product, amount, category } = req.body;

  if (!date || !product || !amount) {
    return res.status(400).json({ error: 'Дата, продукт и сумма обязательны' });
  }

  const query = `
    INSERT INTO receipts (date, product, amount, category)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [date, product, amount, category || null], function (err) {
    if (err) {
      console.error('Ошибка при добавлении записи:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    res.status(201).json({
      id: this.lastID,
      date,
      product,
      amount,
      category: category || null
    });
  });
});

app.delete('/api/receipts/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM receipts WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Ошибка при удалении записи:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ message: 'Запись удалена', id });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  // Сначала получаем имя категории по ID
  db.get('SELECT name FROM categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении категории:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    const categoryName = row.name;

    // Удаляем категорию из таблицы categories
    db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Ошибка при удалении категории:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }

      // Очищаем категорию в таблице receipts
      db.run('UPDATE receipts SET category = NULL WHERE category = ?', [categoryName], function (err) {
        if (err) {
          console.error('Ошибка при очистке категории в receipts:', err.message);
          return res.status(500).json({ error: 'Ошибка при обновлении товаров' });
        }

        res.json({ message: 'Категория удалена и очищена в товарах', id });
      });
    });
  });
});


app.get('/api/total-expenses-range', (req, res) => {
  const { start, end } = req.query;

  const query = `
    SELECT 
      date,
      SUM(amount) AS total
    FROM receipts
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `;

  db.all(query, [start, end], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении данных:', err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.json(rows);
  });
});

app.post('/api/categories/rename', async (req, res) => {
  const { oldName, newName } = req.body;
  try {
    await db.run('UPDATE categories SET name = ? WHERE name = ?', newName, oldName);
    await db.run('UPDATE receipts SET category = ? WHERE category = ?', newName, oldName);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при переименовании категории:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});