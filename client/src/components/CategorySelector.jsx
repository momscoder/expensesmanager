import { useEffect, useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';
import './CategorySelector.css';

function CategorySelector({ value, onChange, categories, onCategoriesUpdate }) {
  const [localCategories, setLocalCategories] = useState(categories || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      if (modalMode === 'add') {
        const res = await fetchWithToken('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

        const res = await fetchWithToken('/api/categories/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedCategory = async () => {
    if (!value) return alert('Выберите категорию для удаления');
    const categoryToDelete = categories.find(c => c.name === value);
    if (!categoryToDelete) return;

    const confirmDelete = window.confirm(`Удалить категорию "${value}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetchWithToken(`/api/categories/${categoryToDelete.id}`, {
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
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Произошла ошибка при удалении');
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
        <div className="category-modal-overlay" onClick={closeModal}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === 'add' ? 'Добавить категорию' : 'Редактировать категорию'}</h3>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Название категории"
              className="category-modal-input"
              autoFocus
              disabled={loading}
            />
            <div className="category-modal-buttons">
              <button
                className="category-modal-button primary"
                onClick={handleSave}
                disabled={loading || !inputValue.trim()}
              >
                {loading ? '💾 Сохранение...' : '💾 Сохранить'}
              </button>
              <button
                className="category-modal-button secondary"
                onClick={closeModal}
                disabled={loading}
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
