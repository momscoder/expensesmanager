import PropTypes from 'prop-types';

function DateInput({ value, onChange }) {
  const today = new Date();
  const thisYear = today.getFullYear();

  const min = `${thisYear}-01-01`;
  const max = today.toISOString().split('T')[0]; // текущая дата в формате yyyy-mm-dd

  const handleChange = (e) => {
    const newValue = e.target.value;
    // Validate date format
    if (newValue && !/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
      console.warn('Invalid date format:', newValue);
      return;
    }
    onChange(newValue);
  };

  return (
    <input
      type="date"
      value={value || ''}
      onChange={handleChange}
      min={min}
      max={max}
      required
    />
  );
}

DateInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired
};

export default DateInput;