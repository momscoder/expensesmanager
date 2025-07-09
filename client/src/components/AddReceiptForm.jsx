import React, { useState } from 'react';

const AddReceiptForm = ({ onAddReceipt }) => {
  const [formData, setFormData] = useState({
    date: '',
    product: '',
    amount: '',
    category: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    fetch('http://localhost:3000/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        amount: parseFloat(formData.amount)
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Ошибка при добавлении');
        return res.json();
      })
      .then(data => {
        console.log('Добавлено:', data);
        setFormData({ date: '', product: '', amount: '', category: '' });
        if (onAddReceipt) onAddReceipt(data);
      })
      .catch(err => console.error(err.message));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="product"
        placeholder="Продукт"
        value={formData.product}
        onChange={handleChange}
        required
      />
      <input
        type="number"
        name="amount"
        placeholder="Сумма"
        value={formData.amount}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="category"
        placeholder="Категория (необязательно)"
        value={formData.category}
        onChange={handleChange}
      />
      <button type="submit">Добавить</button>
    </form>
  );
};

export default AddReceiptForm;
