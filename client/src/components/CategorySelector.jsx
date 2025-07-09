import { useEffect, useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken'; // новый импорт
import './CategorySelector.css';

function CategorySelector({ value, onChange, categories, onCategoriesUpdate }) {
  const [localCategories, setLocalCategories] = useState(categories || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const openModal = (mode) => {
    setModalMode(mode);
    setInputValue(mode === 'edit' ? value : '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setInputValue('');
  };

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (modalMode === 'add') {
      const res = await fetchWithToken('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed })
      });
      const result = await res.json();
      if (result.id && result.name) {
        const updated = [...localCategories, result];
        setLocalCategories(updated);
        onCategoriesUpdate(updated);
        closeModal();
      } else {
        alert(result.error);
      }
    }

    if (modalMode === 'edit') {
      const oldCategory = categories.find(c => c.name === value);
      if (!oldCategory) return;

      const res = await fetchWithToken('http://localhost:3000/api/categories/rename', {
        method: 'POST',
        body: JSON.stringify({ oldName: value, newName: trimmed })
      });
      const result = await res.json();
      if (result.success) {
        const updated = localCategories.map(c =>
          c.id === oldCategory.id ? { ...c, name: trimmed } : c
        );
        setLocalCategories(updated);
        onChange(trimmed);
        onCategoriesUpdate(updated);
        closeModal();
      } else {
        alert(result.error || 'Ошибка при переименовании');
      }
    }
  };

  const deleteSelectedCategory = async () => {
    if (!value) return alert('Выберите категорию для удаления');
    const categoryToDelete = categories.find(c => c.name === value);
    if (!categoryToDelete) return;

    const confirmDelete = window.confirm(`Удалить категорию "${value}"?`);
    if (!confirmDelete) return;

    const res = await fetchWithToken(`http://localhost:3000/api/categories/${categoryToDelete.id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      const updated = localCategories.filter(c => c.id !== categoryToDelete.id);
      setLocalCategories(updated);
      onChange('');
      onCategoriesUpdate(updated);
    } else {
      const err = await res.json();
      alert(err.error || 'Ошибка при удалении');
    }
  };

  return (
    <div>
      <div className="category-wrapper">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="category-select"
        >
          <option value="">— выбери категорию —</option>
          {localCategories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <div className="category-button-group">
          {!value && (
            <button className="category-button" onClick={() => openModal('add')}>
              ➕ Добавить
            </button>
          )}
          {value && (
            <>
              <button className="category-button edit" onClick={() => openModal('edit')}>
                ✏️ Редактировать
              </button>
              <button className="category-button delete" onClick={deleteSelectedCategory}>
                🗑 Удалить
              </button>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3>{modalMode === 'add' ? 'Добавить категорию' : 'Редактировать категорию'}</h3>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Название категории"
              style={modalStyles.input}
              autoFocus
            />
            <div style={modalStyles.buttonGroup}>
              <button
                style={{ ...modalStyles.button, background: '#007acc', color: '#fff' }}
                onClick={handleSave}
              >
                💾 Сохранить
              </button>
              <button
                style={{ ...modalStyles.button, background: '#444', color: '#fff' }}
                onClick={closeModal}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategorySelector;

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  modal: {
    background: '#1e1e1e',
    color: '#fff',
    padding: '1.5rem',
    borderRadius: '10px',
    minWidth: '300px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #444',
    background: '#2c2c2c',
    color: '#fff',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
