import { useEffect, useState } from 'react';
import CategorySelector from '../components/CategorySelector';
import AddReceiptForm from '../components/AddReceiptForm';
import BackButton from '../components/BackButton';
import { fetchWithToken } from '../utils/fetchWithToken';

function Stats() {
  const [data, setData] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editName, setEditName] = useState('');
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [editReceiptDate, setEditReceiptDate] = useState('');
  const [editReceiptName, setEditReceiptName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await fetchWithToken('/api/categories');
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {
      console.error('Ошибка при загрузке категорий:', err);
      setError('Ошибка при загрузке категорий');
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить этот чек?');
    if (!confirmDelete) return;

    setDeletingId(id);

    try {
      const res = await fetchWithToken(`/api/receipts/${id}`, {
        method: 'DELETE',
      });
      
      if (!res || !res.ok) {
        throw new Error('Ошибка при удалении');
      }
      
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting receipt:', err);
      alert('Ошибка при удалении чека');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePurchase = async (purchaseId, receiptId) => {
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить эту покупку?');
    if (!confirmDelete) return;

    try {
      const res = await fetchWithToken(`/api/purchases/${purchaseId}`, {
        method: 'DELETE',
      });
      
      if (!res || !res.ok) {
        throw new Error('Ошибка при удалении покупки');
      }
      
      const result = await res.json();
      
      if (result.deletedReceipt) {
        // If the entire receipt was deleted
        setData(prev => prev.filter(item => item.id !== receiptId));
      } else {
        // If only the purchase was deleted, refresh the data to get updated totals
        const refreshRes = await fetchWithToken('/api/stats');
        const refreshData = await refreshRes.json();
        setData(refreshData);
      }
    } catch (err) {
      console.error('Error deleting purchase:', err);
      alert('Ошибка при удалении покупки');
    }
  };

  const handleEditPurchase = (purchase) => {
    setEditingPurchase(purchase.id);
    setEditName(purchase.name);
  };

  const handleSaveEdit = async (purchaseId) => {
    if (!editName.trim()) {
      alert('Название не может быть пустым');
      return;
    }

    try {
      const res = await fetchWithToken(`/api/update-purchase/${purchaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!res || !res.ok) {
        throw new Error('Ошибка при обновлении названия');
      }

      setData(prev =>
        prev.map(receipt => ({
          ...receipt,
          purchases: receipt.purchases.map(purchase =>
            purchase.id === purchaseId 
              ? { ...purchase, name: editName.trim() }
              : purchase
          )
        }))
      );

      setEditingPurchase(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating purchase name:', error);
      alert('Ошибка при обновлении названия');
    }
  };

  const handleCancelEdit = () => {
    setEditingPurchase(null);
    setEditName('');
  };

  const handleEditPurchasePrice = async (purchaseId, newAmount) => {
    if (newAmount <= 0 || newAmount > 999999.99) {
      alert('Сумма должна быть больше 0 и меньше 1,000,000');
      return;
    }

    try {
      const res = await fetchWithToken(`/api/update-purchase-price/${purchaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: newAmount }),
      });

      if (!res || !res.ok) {
        throw new Error('Ошибка при обновлении цены');
      }

      // Refresh data to get updated totals
      const refreshRes = await fetchWithToken('/api/stats');
      const refreshData = await refreshRes.json();
      setData(refreshData);
    } catch (error) {
      console.error('Error updating purchase price:', error);
      alert('Ошибка при обновлении цены');
    }
  };

  const handleEditReceiptDate = (receipt) => {
    setEditingReceipt({ ...receipt, field: 'date' });
    setEditReceiptDate(receipt.date);
  };

  const handleEditReceiptName = (receipt) => {
    setEditingReceipt({ ...receipt, field: 'name' });
    setEditReceiptName(receipt.uid || '');
  };

  const handleSaveReceiptEdit = async () => {
    if (!editingReceipt) return;

    try {
      let res;
      if (editingReceipt.field === 'date') {
        res = await fetchWithToken(`/api/update-receipt-date/${editingReceipt.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: editReceiptDate }),
        });
      } else if (editingReceipt.field === 'name') {
        res = await fetchWithToken(`/api/update-receipt-name/${editingReceipt.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: editReceiptName.trim() || null }),
        });
      }

      if (!res || !res.ok) {
        throw new Error('Ошибка при обновлении');
      }

      setData(prev =>
        prev.map(receipt =>
          receipt.id === editingReceipt.id
            ? {
                ...receipt,
                date: editingReceipt.field === 'date' ? editReceiptDate : receipt.date,
                uid: editingReceipt.field === 'name' ? (editReceiptName.trim() || null) : receipt.uid
              }
            : receipt
        )
      );

      setEditingReceipt(null);
      setEditReceiptDate('');
      setEditReceiptName('');
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Ошибка при обновлении');
    }
  };

  const handleCancelReceiptEdit = () => {
    setEditingReceipt(null);
    setEditReceiptDate('');
    setEditReceiptName('');
  };

  const handleCategoriesUpdate = (updatedList) => {
    setCategories(updatedList);
  };

  const handleAddReceipt = (newReceipt) => {
    setData(prev => [newReceipt, ...prev]);
  };

  const handleCategoryChange = async (purchaseId, newCategory) => {
    try {
      await fetchWithToken(`/api/update-category/${purchaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });

      setData(prev =>
        prev.map(receipt => ({
          ...receipt,
          purchases: receipt.purchases.map(purchase =>
            purchase.id === purchaseId 
              ? { ...purchase, category: newCategory }
              : purchase
          )
        }))
      );
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Ошибка при обновлении категории');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetchWithToken('/api/stats');
        const data = await res.json();
        setData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchCategories();
  }, []);

  if (error) {
    return (
      <div className="container">
        <BackButton />
        <div className="error">{error}</div>
        <button onClick={() => window.location.reload()} className="form-button">
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <BackButton />
      
      <div className="container">
        <h2 className="text-center">База данных расходов</h2>
        
        <div className="flex justify-center gap-md my-md">
          <button 
            onClick={() => setShowSelector(prev => !prev)}
            className="form-button"
          >
            {showSelector ? 'Скрыть категории' : 'Изменить категории'}
          </button>
        </div>

        {showSelector && (
          <div className="my-md">
            <CategorySelector
              value={selectedCategory}
              onChange={setSelectedCategory}
              categories={categories}
              onCategoriesUpdate={handleCategoriesUpdate}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Загрузка данных...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <p>Нет данных для отображения</p>
        </div>
      ) : (
        <div className="receipts-list">
          {data.map((receipt) => (
            <div key={receipt.id} className={`receipt-card ${deletingId === receipt.id ? 'fade-out' : ''}`}>
              <div className="receipt-header">
                <div className="receipt-info">
                  {editingReceipt?.id === receipt.id && editingReceipt.field === 'date' ? (
                    <div className="edit-receipt-form">
                      <input
                        type="date"
                        value={editReceiptDate}
                        onChange={(e) => setEditReceiptDate(e.target.value)}
                        className="edit-receipt-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveReceiptEdit();
                          if (e.key === 'Escape') handleCancelReceiptEdit();
                        }}
                        autoFocus
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={handleSaveReceiptEdit}
                          className="save-edit-btn"
                          title="Сохранить"
                        >
                          ✅
                        </button>
                        <button
                          onClick={handleCancelReceiptEdit}
                          className="cancel-edit-btn"
                          title="Отменить"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span 
                      className="receipt-date"
                      onClick={() => handleEditReceiptDate(receipt)}
                      title="Нажмите для редактирования даты"
                    >
                      {receipt.date}
                    </span>
                  )}
                  
                  {editingReceipt?.id === receipt.id && editingReceipt.field === 'name' ? (
                    <div className="edit-receipt-form">
                      <input
                        type="text"
                        value={editReceiptName}
                        onChange={(e) => setEditReceiptName(e.target.value)}
                        className="edit-receipt-input"
                        placeholder="Название чека"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveReceiptEdit();
                          if (e.key === 'Escape') handleCancelReceiptEdit();
                        }}
                        autoFocus
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={handleSaveReceiptEdit}
                          className="save-edit-btn"
                          title="Сохранить"
                        >
                          ✅
                        </button>
                        <button
                          onClick={handleCancelReceiptEdit}
                          className="cancel-edit-btn"
                          title="Отменить"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span 
                      className="receipt-uid"
                      onClick={() => handleEditReceiptName(receipt)}
                      title="Нажмите для редактирования названия"
                    >
                      {receipt.uid ? `UID: ${receipt.uid}` : 'Название: не указано'}
                    </span>
                  )}
                  
                  <span className="receipt-total">Итого: {receipt.total_amount} ₽</span>
                </div>
                <button
                  onClick={() => handleDelete(receipt.id)}
                  className="delete-button"
                  title="Удалить чек"
                >
                  ❌
                </button>
              </div>
              
              <div className="purchases-list">
                {receipt.purchases.map((purchase) => (
                  <div key={purchase.id} className="purchase-item">
                    <div className="purchase-info">
                      {editingPurchase === purchase.id ? (
                        <div className="edit-purchase-form">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="edit-purchase-input"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(purchase.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="edit-buttons">
                            <button
                              onClick={() => handleSaveEdit(purchase.id)}
                              className="save-edit-btn"
                              title="Сохранить"
                            >
                              ✅
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="cancel-edit-btn"
                              title="Отменить"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="purchase-name-container">
                          <span 
                            className="purchase-name"
                            onClick={() => handleEditPurchase(purchase)}
                            title="Нажмите для редактирования"
                          >
                            {purchase.name}
                          </span>
                          <button
                            onClick={() => handleEditPurchase(purchase)}
                            className="edit-purchase-btn"
                            title="Редактировать название"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                      
                      <div className="purchase-amount-container">
                        <input
                          type="number"
                          step="0.01"
                          value={purchase.amount}
                          onChange={(e) => handleEditPurchasePrice(purchase.id, parseFloat(e.target.value) || 0)}
                          className="purchase-amount-input"
                          title="Изменить цену"
                        />
                        <span className="currency">₽</span>
                      </div>
                    </div>
                    <div className="purchase-actions">
                      <select
                        value={purchase.category || ''}
                        onChange={(e) => handleCategoryChange(purchase.id, e.target.value)}
                        className="category-select"
                      >
                        <option value="">— выбери категорию —</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDeletePurchase(purchase.id, receipt.id)}
                        className="delete-purchase-btn"
                        title="Удалить покупку"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card my-lg">
        <AddReceiptForm onAddReceipt={handleAddReceipt} />
      </div>
    </div>
  );
}

export default Stats;