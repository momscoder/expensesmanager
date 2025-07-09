import sqlite3 from 'sqlite3';
import path from 'path';

const mainDb = new sqlite3.Database('./receipts.db'); // текущая база
const oldDb = new sqlite3.Database('./OLD.db'); // старая база

const TARGET_USER_EMAIL = 'bebra';
let userId = null;

function getUserIdByEmail(email) {
  return new Promise((resolve, reject) => {
    mainDb.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else if (!row) reject(new Error('Пользователь не найден'));
      else resolve(row.id);
    });
  });
}

function migrateReceipts() {
  return new Promise((resolve, reject) => {
    oldDb.all('SELECT * FROM receipts', [], (err, rows) => {
      if (err) return reject(err);

      const stmt = mainDb.prepare(`
        INSERT INTO receipts (date, product, amount, category, user_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const row of rows) {
        stmt.run([row.date, row.product, row.amount, row.category, userId]);
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve(rows.length);
      });
    });
  });
}

function migrateCategories() {
  return new Promise((resolve, reject) => {
    oldDb.all(`SELECT DISTINCT category FROM receipts WHERE category IS NOT NULL`, [], (err, rows) => {
      if (err) return reject(err);

      const stmt = mainDb.prepare(`INSERT OR IGNORE INTO categories (name, user_id) VALUES (?, ?)`);

      for (const row of rows) {
        stmt.run([row.category, userId]);
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve(rows.length);
      });
    });
  });
}

function migrateUsedReceipts() {
  return new Promise((resolve, reject) => {
    oldDb.all('SELECT * FROM used_receipts', [], (err, rows) => {
      if (err) return reject(err);

      const stmt = mainDb.prepare(`
        INSERT OR IGNORE INTO used_receipts (receipt_hash, added_at, user_id)
        VALUES (?, ?, ?)
      `);

      for (const row of rows) {
        stmt.run([row.receipt_hash, row.added_at || new Date().toISOString(), userId]);
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve(rows.length);
      });
    });
  });
}


(async () => {
  try {
    userId = await getUserIdByEmail(TARGET_USER_EMAIL);

    const receipts = await migrateReceipts();
const cats = await migrateCategories();
const used = await migrateUsedReceipts();

console.log(`✅ Перенесено ${receipts} чеков, ${cats} категорий и ${used} used_receipts под user_id ${userId}`);


    oldDb.close();
    mainDb.close();
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    oldDb.close();
    mainDb.close();
  }
})();
