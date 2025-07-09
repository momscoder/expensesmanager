import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateRangePicker = ({ startDate, endDate, onStartChange, onEndChange, onSubmit }) => {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
      <label>С:</label>{' '}
      <DatePicker
        selected={startDate}
        onChange={onStartChange}
        dateFormat="dd.MM.yyyy"
        placeholderText="Начало"
        maxDate={endDate || new Date()}
      />
      {' '}
      <label>по:</label>{' '}
      <DatePicker
        selected={endDate}
        onChange={onEndChange}
        dateFormat="dd.MM.yyyy"
        placeholderText="Конец"
        minDate={startDate}
        maxDate={new Date()}
      />
      {' '}
      <button onClick={onSubmit} disabled={!startDate || !endDate}>
        Показать
      </button>
    </div>
  );
};

export default DateRangePicker;
