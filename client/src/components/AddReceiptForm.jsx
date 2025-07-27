import { useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';

const AddReceiptForm = ({ onAddReceipt }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchases, setPurchases] = useState([{ name: '', amount: '' }]);
  const [loading, setLoading] = useState(false);

  const addPurchase = () => {
    setPurchases([...purchases, { name: '', amount: '' }]);
  };

  const removePurchase = (index) => {
    if (purchases.length > 1) {
      setPurchases(purchases.filter((_, i) => i !== index));
    }
  };

  const updatePurchase = (index, field, value) => {
    const updatedPurchases = [...purchases];
    updatedPurchases[index] = { ...updatedPurchases[index], [field]: value };
    setPurchases(updatedPurchases);
  };

  const calculateTotal = () => {
    return purchases.reduce((total, purchase) => {
      return total + (parseFloat(purchase.amount) || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate purchases
    const validPurchases = purchases.filter(p => p.name.trim() && p.amount);
    if (validPurchases.length === 0) {
      alert('Добавьте хотя бы одну покупку');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      alert('Общая сумма должна быть больше 0');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithToken('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          purchases: validPurchases.map(p => ({
            name: p.name.trim(),
            amount: parseFloat(p.amount),
            category: null
          })),
          total_amount: totalAmount
        })
      });

      if (res.ok) {
        const newReceipt = await res.json();
        onAddReceipt(newReceipt);
        setPurchases([{ name: '', amount: '' }]);
        setDate(new Date().toISOString().split('T')[0]);
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при добавлении чека');
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      alert('Ошибка при добавлении чека');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-receipt-form">
      <h3>Добавить чек вручную</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Дата:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="purchases-section">
          <label>Покупки:</label>
          {purchases.map((purchase, index) => (
            <div key={index} className="purchase-input-group">
              <input
                type="text"
                placeholder="Название товара"
                value={purchase.name}
                onChange={(e) => updatePurchase(index, 'name', e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Сумма"
                value={purchase.amount}
                onChange={(e) => updatePurchase(index, 'amount', e.target.value)}
                required
              />
              {purchases.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePurchase(index)}
                  className="remove-purchase-btn"
                >
                  ❌
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addPurchase}
            className="add-purchase-btn"
          >
            + Добавить покупку
          </button>
        </div>

        <div className="total-section">
          <strong>Итого: {calculateTotal().toFixed(2)} ₽</strong>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Добавление...' : 'Добавить чек'}
        </button>
      </form>
    </div>
  );
};

export default AddReceiptForm;
