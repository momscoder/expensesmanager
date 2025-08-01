import sqlite3 from 'sqlite3';
import crypto from 'crypto';

const db = new sqlite3.Database('./receipts.db');

console.log('🔄 Starting migration to new database format...');

db.serialize(() => {
  // Check if old receipts table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts'", [], (err, row) => {
    if (err) {
      console.error('❌ Error checking table existence:', err);
      return;
    }

    if (row) {
      // Old table exists, perform migration
      console.log('📋 Old receipts table found, performing migration...');
      
      // Create new tables
      console.log('📋 Creating new tables...');
      
      db.run(`
        CREATE TABLE IF NOT EXISTS receipts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT,
          date TEXT NOT NULL,
          total_amount REAL NOT NULL,
          hash TEXT UNIQUE,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS purchases_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT,
          FOREIGN KEY (receipt_id) REFERENCES receipts_new(id) ON DELETE CASCADE
        );
      `);

      // Migrate data
      console.log('📦 Migrating data...');
      
      db.all('SELECT * FROM receipts ORDER BY id', [], (err, oldReceipts) => {
        if (err) {
          console.error('❌ Error reading old receipts:', err);
          return;
        }

        console.log(`📊 Found ${oldReceipts.length} receipts to migrate`);

        let migratedCount = 0;
        const totalReceipts = oldReceipts.length;

        oldReceipts.forEach((oldReceipt) => {
          // Generate hash for old receipt
          const hash = crypto.createHash('sha256')
            .update(`${oldReceipt.product || ''}${oldReceipt.date}${oldReceipt.amount}${oldReceipt.user_id}`)
            .digest('hex');

          // Insert new receipt
          db.run(
            'INSERT INTO receipts_new (uid, date, total_amount, hash, user_id) VALUES (?, ?, ?, ?, ?)',
            [oldReceipt.id, oldReceipt.date, oldReceipt.amount, hash, oldReceipt.user_id],
            function (err) {
              if (err) {
                console.error('❌ Error inserting new receipt:', err);
                return;
              }

              const newReceiptId = this.lastID;

              // Insert purchase
              db.run(
                'INSERT INTO purchases_new (receipt_id, name, amount, category) VALUES (?, ?, ?, ?)',
                [newReceiptId, oldReceipt.product, oldReceipt.amount, oldReceipt.category],
                (err) => {
                  if (err) {
                    console.error('❌ Error inserting purchase:', err);
                    return;
                  }

                  migratedCount++;
                  console.log(`✅ Migrated receipt ${migratedCount}/${totalReceipts}`);

                  if (migratedCount === totalReceipts) {
                    // Migration complete
                    console.log('🎉 Migration completed!');
                    
                    // Drop old table and rename new ones
                    // После завершения миграции:
                    // 1. Удалить старые таблицы receipts и purchases, если они есть
                    // 2. Переименовать receipts_new -> receipts, purchases_new -> purchases
                    // 3. Логировать каждый шаг

                    // Проверка и удаление старых таблиц
                    const dropAndRenameTables = () => {
                      db.serialize(() => {
                        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts'", [], (err, row) => {
                          if (row) {
                            console.log('Удаляю старую таблицу receipts...');
                            db.run('DROP TABLE receipts', (err) => {
                              if (err) console.error('Ошибка при удалении receipts:', err);
                              else console.log('Старая таблица receipts удалена.');
                              renameReceipts();
                            });
                          } else {
                            renameReceipts();
                          }
                        });
                        function renameReceipts() {
                          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts_new'", [], (err, row) => {
                            if (row) {
                              db.run('ALTER TABLE receipts_new RENAME TO receipts', (err) => {
                                if (err) console.error('Ошибка при переименовании receipts_new:', err);
                                else console.log('receipts_new переименована в receipts.');
                                dropPurchases();
                              });
                            } else {
                              dropPurchases();
                            }
                          });
                        }
                        function dropPurchases() {
                          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases'", [], (err, row) => {
                            if (row) {
                              console.log('Удаляю старую таблицу purchases...');
                              db.run('DROP TABLE purchases', (err) => {
                                if (err) console.error('Ошибка при удалении purchases:', err);
                                else console.log('Старая таблица purchases удалена.');
                                renamePurchases();
                              });
                            } else {
                              renamePurchases();
                            }
                          });
                        }
                        function renamePurchases() {
                          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases_new'", [], (err, row) => {
                            if (row) {
                              db.run('ALTER TABLE purchases_new RENAME TO purchases', (err) => {
                                if (err) console.error('Ошибка при переименовании purchases_new:', err);
                                else console.log('purchases_new переименована в purchases.');
                                finish();
                              });
                            } else {
                              finish();
                            }
                          });
                        }
                        function finish() {
                          console.log('✅ Database migration completed successfully!');
                          db.close();
                        }
                      });
                    };

                    dropAndRenameTables();
                  }
                }
              );
            }
          );
        });

        if (totalReceipts === 0) {
          console.log('✅ No receipts to migrate');
          // Проверка и удаление старых таблиц
          const dropAndRenameTables = () => {
            db.serialize(() => {
              db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts'", [], (err, row) => {
                if (row) {
                  console.log('Удаляю старую таблицу receipts...');
                  db.run('DROP TABLE receipts', (err) => {
                    if (err) console.error('Ошибка при удалении receipts:', err);
                    else console.log('Старая таблица receipts удалена.');
                    renameReceipts();
                  });
                } else {
                  renameReceipts();
                }
              });
              function renameReceipts() {
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts_new'", [], (err, row) => {
                  if (row) {
                    db.run('ALTER TABLE receipts_new RENAME TO receipts', (err) => {
                      if (err) console.error('Ошибка при переименовании receipts_new:', err);
                      else console.log('receipts_new переименована в receipts.');
                      dropPurchases();
                    });
                  } else {
                    dropPurchases();
                  }
                });
              }
              function dropPurchases() {
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases'", [], (err, row) => {
                  if (row) {
                    console.log('Удаляю старую таблицу purchases...');
                    db.run('DROP TABLE purchases', (err) => {
                      if (err) console.error('Ошибка при удалении purchases:', err);
                      else console.log('Старая таблица purchases удалена.');
                      renamePurchases();
                    });
                  } else {
                    renamePurchases();
                  }
                });
              }
              function renamePurchases() {
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases_new'", [], (err, row) => {
                  if (row) {
                    db.run('ALTER TABLE purchases_new RENAME TO purchases', (err) => {
                      if (err) console.error('Ошибка при переименовании purchases_new:', err);
                      else console.log('purchases_new переименована в purchases.');
                      finish();
                    });
                  } else {
                    finish();
                  }
                });
              }
              function finish() {
                console.log('✅ Database migration completed successfully!');
                db.close();
              }
            });
          };

          dropAndRenameTables();
        }
      });
    } else {
      // No old table, just rename new tables if they exist
      console.log('📋 No old receipts table found, checking for new tables...');
      
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts_new'", [], (err, row) => {
        if (err) {
          console.error('❌ Error checking new table existence:', err);
          return;
        }

        if (row) {
          console.log('📋 New tables found, renaming them...');
          
          db.run('ALTER TABLE receipts_new RENAME TO receipts', (err) => {
            if (err) console.error('❌ Error renaming receipts table:', err);
            
            db.run('ALTER TABLE purchases_new RENAME TO purchases', (err) => {
              if (err) console.error('❌ Error renaming purchases table:', err);
              
              console.log('✅ Database tables renamed successfully!');
              db.close();
            });
          });
        } else {
          console.log('📋 No new tables found, creating fresh database...');
          
          // Create tables with proper names
          db.run(`
            CREATE TABLE IF NOT EXISTS receipts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              uid TEXT,
              date TEXT NOT NULL,
              total_amount REAL NOT NULL,
              hash TEXT UNIQUE,
              user_id INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

          console.log('✅ Fresh database created successfully!');
          db.close();
        }
      });
    }
  });
});

// Функция для ручного переименования таблиц в каноничные имена
export function renameTablesToCanonicalNames() {
  db.serialize(() => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts'", [], (err, row) => {
      if (row) {
        console.log('Удаляю старую таблицу receipts...');
        db.run('DROP TABLE receipts', (err) => {
          if (err) console.error('Ошибка при удалении receipts:', err);
          else console.log('Старая таблица receipts удалена.');
          renameReceipts();
        });
      } else {
        renameReceipts();
      }
    });
    function renameReceipts() {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='receipts_new'", [], (err, row) => {
        if (row) {
          db.run('ALTER TABLE receipts_new RENAME TO receipts', (err) => {
            if (err) console.error('Ошибка при переименовании receipts_new:', err);
            else console.log('receipts_new переименована в receipts.');
            dropPurchases();
          });
        } else {
          dropPurchases();
        }
      });
    }
    function dropPurchases() {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases'", [], (err, row) => {
        if (row) {
          console.log('Удаляю старую таблицу purchases...');
          db.run('DROP TABLE purchases', (err) => {
            if (err) console.error('Ошибка при удалении purchases:', err);
            else console.log('Старая таблица purchases удалена.');
            renamePurchases();
          });
        } else {
          renamePurchases();
        }
      });
    }
    function renamePurchases() {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases_new'", [], (err, row) => {
        if (row) {
          db.run('ALTER TABLE purchases_new RENAME TO purchases', (err) => {
            if (err) console.error('Ошибка при переименовании purchases_new:', err);
            else console.log('purchases_new переименована в purchases.');
            finish();
          });
        } else {
          finish();
        }
      });
    }
    function finish() {
      console.log('✅ Ручное переименование таблиц завершено!');
      db.close();
    }
  });
}
