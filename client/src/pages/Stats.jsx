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

  const fetchCategories = () => {
    fetchWithToken('http://localhost:3000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error('Ошибка при загрузке категорий:', err));
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить эту запись?');
    if (!confirmDelete) return;

    setDeletingId(id);

    setTimeout(() => {
      fetchWithToken(`http://localhost:3000/api/receipts/${id}`, {
        method: 'DELETE',
      })
        .then(res => {
          if (!res.ok) throw new Error('Ошибка при удалении');
          return res.json();
        })
        .then(() => {
          setData(prev => prev.filter(item => item.id !== id));
          setDeletingId(null);
        })
        .catch(err => {
          console.error(err.message);
          setDeletingId(null);
        });
    }, 400);
  };

  const handleCategoriesUpdate = (updatedList) => {
    setCategories(updatedList);
  };

  const handleAddReceipt = (newReceipt) => {
    setData(prev => [...prev, newReceipt]);
  };

  const handleCategoryChange = async (id, newCategory) => {
    await fetchWithToken(`http://localhost:3000/api/update-category/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory }),
    });

    setData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, category: newCategory } : item
      )
    );
  };

  useEffect(() => {
    fetchWithToken('http://localhost:3000/api/stats')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);

    fetchCategories();
  }, []);

  return (
    <div>
      <BackButton />
      <h2>База данных расходов</h2>
      <div>
        <button onClick={() => setShowSelector(prev => !prev)}>
          {showSelector ? 'Скрыть категории' : 'Изменить категории'}
        </button>

        {showSelector && (
          <div style={{ marginTop: '1rem' }}>
            <CategorySelector
              value={selectedCategory}
              onChange={setSelectedCategory}
              categories={categories}
              onCategoriesUpdate={handleCategoriesUpdate}
            />
          </div>
        )}
      </div>

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
                  style={{ padding: '8px', borderRadius: '6px' }}
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

      <AddReceiptForm onAddReceipt={handleAddReceipt} />
    </div>
  );
}

export default Stats;