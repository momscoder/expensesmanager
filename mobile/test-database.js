import DatabaseService from './src/services/DatabaseService';

async function testDatabase() {
  try {
    console.log('Testing database initialization...');
    await DatabaseService.initDatabase();
    console.log('✅ Database initialized successfully');
    
    console.log('Testing receipt addition...');
    const receiptId = await DatabaseService.addReceipt({
      date: '2024-01-15',
      product: 'Test Product',
      amount: 100.50,
      category: 'Test Category',
      uid: 'test-user'
    });
    console.log('✅ Receipt added with ID:', receiptId);
    
    console.log('Testing receipt retrieval...');
    const receipts = await DatabaseService.getReceipts();
    console.log('✅ Retrieved receipts:', receipts.length);
    
    console.log('Testing category addition...');
    const categoryId = await DatabaseService.addCategory({
      name: 'Test Category'
    });
    console.log('✅ Category added with ID:', categoryId);
    
    console.log('Testing category retrieval...');
    const categories = await DatabaseService.getCategories();
    console.log('✅ Retrieved categories:', categories.length);
    
    console.log('All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase(); 