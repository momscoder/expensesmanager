import crypto from 'crypto';

function cleanProductName(str) {
  return str.replace(/^\d+/, '');
}

function generateReceiptHash(uid, date) {
  const raw = `${uid}_${date}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function receiptExists(db, userId, uid, date) {
  const receiptHash = generateReceiptHash(uid, date);
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 FROM used_receipts WHERE receipt_hash = ? AND user_id = ?`,
      [receiptHash, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row); 
      }
    );
  });
}

/**
 * Сохраняет чек в базу
 * @param {*} db — sqlite-соединение
 * @param {*} userId — id пользователя
 * @param {*} data — объект с positions
 * @param {*} date — дата покупки
 * @param {*} uid — UID чека
 * @returns {number} 0 - невалидно, 1 - уже был, 2 - сохранён
 */
export default async function loadReceipt(db, userId, data, date, uid) {
  if (!data?.message?.positions || !date || !uid || !userId) {
    console.log('❌ Invalid data');
    return 0;
  }

  if (await receiptExists(db, userId, uid, date)) {
    console.log('🚫 Чек уже был');
    return 1;
  }

  const positions = JSON.parse(data.message.positions);
  for (const { product_name, amount } of positions) {
    if (product_name && amount) {
      await db.run(
        'INSERT INTO receipts (date, product, amount, category, user_id) VALUES (?, ?, ?, ?, ?)',
        [date,
          cleanProductName(product_name),
          amount,
          "",
          userId]
      );
    }
  }

  const hash = generateReceiptHash(uid, date);
  await db.run(`INSERT INTO used_receipts (receipt_hash, user_id) VALUES (?, ?)`, [hash, userId]);

  console.log('📥 Чек загружен');
  return 2;
}
