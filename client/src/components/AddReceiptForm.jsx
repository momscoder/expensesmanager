import { useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';

const AddReceiptForm = ({ onAddReceipt }) => {
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.trim() || !amount.trim()) return;

    setLoading(true);
    try {
      const res = await fetchWithToken('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, amount: parseFloat(amount), date })
      });

      if (res.ok) {
        const newReceipt = await res.json();
        onAddReceipt(newReceipt);
        setProduct('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
      } else {
        alert('Ошибка при добавлении записи');
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      alert('Ошибка при добавлении записи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Добавить новую запись</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          placeholder="Название товара"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Сумма"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Добавление...' : 'Добавить'}
        </button>
      </form>
    </div>
  );
};

export default AddReceiptForm;
