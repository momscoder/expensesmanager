import React, { useEffect, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import BackButton from '../components/BackButton';
import DateRangePicker from '../components/DateRangePicker';
import { fetchWithToken } from '../utils/fetchWithToken';

import './Dashboard.css';

import {
  Chart as ChartJS,
  LineElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  LineElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [lineData, setLineData] = useState(null);
  const [pieData, setPieData] = useState(null);
  const [totalSum, setTotalSum] = useState(0);

  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);
  const [startDate, setStartDate] = useState(oneMonthAgo);
  const [endDate, setEndDate] = useState(today);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };

  const fetchDataByRange = () => {
    if (!startDate || !endDate) return;

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    // 📈 График 1: Расходы по дням
    fetchWithToken(`http://localhost:3000/api/total-expenses-range?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        const labels = data.map(item => formatDate(item.date));
        const totals = data.map(item => item.total);

        // Накопленное среднее
        const cumulativeAverage = [];
        let sum = 0;
        for (let i = 0; i < totals.length; i++) {
          sum += totals[i];
          cumulativeAverage.push((sum / (i + 1)).toFixed(2));
        }

        const total = totals.reduce((acc, val) => acc + val, 0);
        setTotalSum(total);

        setLineData({
          labels,
          datasets: [
            {
              label: `Расходы с ${formatDate(start)} по ${formatDate(end)}`,
              borderColor: '#36A2EB',
              data: totals,
              tension: 0.3,
              fill: true,
              pointRadius: 4
            },
            {
              label: 'Среднее до этого дня',
              data: cumulativeAverage,
              backgroundColor: 'rgba(255, 249, 196, 0.5)',
              borderColor: '#FBC02D',
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            }
          ]
        });
      });

    // 🥧 График 2: По категориям
    fetchWithToken(`http://localhost:3000/api/expenses-by-category-range?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        setPieData({
          labels: data.map(d => d.category),
          datasets: [
            {
              label: 'Расходы по категориям',
              data: data.map(d => d.total),
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                '#9966FF', '#FF9F40', '#C9CBCF'
              ]
            }
          ]
        });
      });
  };

  useEffect(() => {
    fetchDataByRange();
  }, []);

  return (
    <div>
      <BackButton />
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        onSubmit={fetchDataByRange}
      />
      <div className="chart-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ flex: 1, minWidth: '400px' }}>
          <h3>Расходы за выбранный период</h3>
          {lineData ? (
            <>
              <Line data={lineData} />
              <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Всего потрачено: {totalSum.toFixed(2)} BYN
              </p>
            </>
          ) : (
            <p>Загрузка...</p>
          )}
        </div>
        <div style={{ flex: 1, minWidth: '400px' }}>
          <h3>По категориям</h3>
          {pieData ? <Pie data={pieData} /> : <p>Загрузка...</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
