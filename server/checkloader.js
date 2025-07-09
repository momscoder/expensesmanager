import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import crypto from 'crypto';

function generateReceiptHash(uid, date) {
  const raw = `${uid}_${date}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function initDatabase() {
  return open({
    filename: './receipts.db',
    driver: sqlite3.Database,
  });
}

function removeDigitsBeforeLetters(str) {
  return str.replace(/^\d+/, '');
}

async function loadReceipt(data, date, uid) {

  if(data?.message?.positions == undefined || date == undefined || uid == undefined) {
    console.log('data undefined');
    return 0;
  }

  const db = await initDatabase();

  const receiptUid = uid;
  const hash = generateReceiptHash(receiptUid, date);

  const existing = await db.get(
    `SELECT 1 FROM used_receipts WHERE receipt_hash = ?`,
    hash
  );
  if (existing) {
    console.log('🚫 Чек уже обработан');
    return 1;
  }

  const pos = JSON.parse(data.message.positions);
  for (const { product_name, amount } of pos) {
    if (product_name && amount) {
      await db.run(
        `INSERT INTO receipts (date, product, amount) VALUES (?, ?, ?)`,
        date,
        removeDigitsBeforeLetters(product_name),
        amount
      );
    }
  }

  await db.run(
    `INSERT INTO used_receipts (receipt_hash) VALUES (?)`,
    hash
  );

  console.log('📥 Данные успешно сохранены в SQLite');
  return 2;
}

export default loadReceipt;