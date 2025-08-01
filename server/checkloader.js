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
  let totalAmount = 0;
  
  // Calculate total amount
  for (const { amount } of positions) {
    if (amount) {
      totalAmount += parseFloat(amount) || 0;
    }
  }

  // Generate receipt hash
  const receiptHash = generateReceiptHash(uid, date);

  return new Promise((resolve, reject) => {
    // Insert receipt
    db.run(
      'INSERT INTO receipts (uid, date, total_amount, hash, user_id) VALUES (?, ?, ?, ?, ?)',
      [uid, date, totalAmount, receiptHash, userId],
      function (err) {
        if (err) {
          console.error('❌ Error inserting receipt:', err);
          return reject(err);
        }

        const receiptId = this.lastID;
        
        // Insert purchases
        const purchaseStmt = db.prepare('INSERT INTO purchases (receipt_id, name, amount, category) VALUES (?, ?, ?, ?)');
        
        positions.forEach(({ product_name, amount }) => {
          if (product_name && amount) {
            purchaseStmt.run([
              receiptId,
              cleanProductName(product_name),
              parseFloat(amount) || 0,
              null // No category initially
            ]);
          }
        });
        
        purchaseStmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting purchases:', err);
            return reject(err);
          }

          // Insert used receipt hash
          db.run(
            'INSERT INTO used_receipts (receipt_hash, user_id) VALUES (?, ?)',
            [receiptHash, userId],
            (err) => {
              if (err) {
                console.error('❌ Error inserting used receipt:', err);
                return reject(err);
              }
              
              console.log('📥 Чек загружен');
              resolve(2);
            }
          );
        });
      }
    );
  });
}
