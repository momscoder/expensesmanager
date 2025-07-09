function DateInput({ value, onChange }) {
  const today = new Date();
  const thisYear = today.getFullYear();

  const min = `${thisYear}-01-01`;
  const max = today.toISOString().split('T')[0]; // текущая дата в формате yyyy-mm-dd

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
    />
  );
}

export default DateInput;