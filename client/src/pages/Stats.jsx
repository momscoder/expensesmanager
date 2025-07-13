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
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить эту запись?');
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
      alert('Ошибка при удалении записи');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCategoriesUpdate = (updatedList) => {
    setCategories(updatedList);
  };

  const handleAddReceipt = (newReceipt) => {
    setData(prev => [...prev, newReceipt]);
  };

  const handleCategoryChange = async (id, newCategory) => {
    try {
      await fetchWithToken(`/api/update-category/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });

      setData(prev =>
        prev.map(item =>
          item.id === id ? { ...item, category: newCategory } : item
        )
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
          <div className="empty-state-icon">📊</div>
          <p>Нет данных для отображения</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="centered-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Товар</th>
                <th>Сумма</th>
                <th>Категория</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ id, date, product, amount, category = '' }) => (
                <tr key={id} className={(deletingId === id ? 'fade-out' : '') + ' table-row'}>
                  <td>{date}</td>
                  <td>{product}</td>
                  <td>{amount}</td>
                  <td>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(id, e.target.value)}
                      className="category-select"
                      style={{ minWidth: '150px' }}
                    >
                      <option value="">— выбери категорию —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '25px' }}>
                    <button
                      onClick={() => handleDelete(id)}
                      className="delete-button"
                      title="Удалить запись"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card my-lg">
        <AddReceiptForm onAddReceipt={handleAddReceipt} />
      </div>
    </div>
  );
}

export default Stats;