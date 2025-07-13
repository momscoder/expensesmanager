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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);
  const [startDate, setStartDate] = useState(oneMonthAgo);
  const [endDate, setEndDate] = useState(today);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };

  const fetchDataByRange = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      // 📈 График 1: Расходы по дням
      const lineResponse = await fetchWithToken(`/api/total-expenses-range?start=${start}&end=${end}`);
      if (!lineResponse || !lineResponse.ok) {
        throw new Error('Ошибка при загрузке данных графика');
      }
      
      const lineResult = await lineResponse.json();
      if (!Array.isArray(lineResult)) {
        throw new Error('Неверный формат данных');
      }
      
      const labels = lineResult.map(item => formatDate(item.date));
      const totals = lineResult.map(item => item.total);

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

      // 🥧 График 2: По категориям
      const pieResponse = await fetchWithToken(`/api/expenses-by-category-range?start=${start}&end=${end}`);
      if (!pieResponse || !pieResponse.ok) {
        throw new Error('Ошибка при загрузке данных категорий');
      }
      
      const pieResult = await pieResponse.json();
      if (!Array.isArray(pieResult)) {
        throw new Error('Неверный формат данных категорий');
      }
      
      setPieData({
        labels: pieResult.map(d => d.category),
        datasets: [
          {
            label: 'Расходы по категориям',
            data: pieResult.map(d => d.total),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
              '#9966FF', '#FF9F40', '#C9CBCF'
            ]
          }
        ]
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Ошибка при загрузке данных');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataByRange();
  }, []);

  if (error) {
    return (
      <div className="container">
        <BackButton />
        <div className="error">{error}</div>
        <button onClick={fetchDataByRange} className="form-button">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <BackButton />
      
      <div className="card">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onSubmit={fetchDataByRange}
        />
      </div>

      <div className="chart-wrapper">
        {loading ? (
          <div className="loading">Загрузка данных...</div>
        ) : (
          <div className="chart-container">
            <div className="chart-item">
              <h3 className="chart-title">Расходы за выбранный период</h3>
              {lineData && (
                <>
                  <div className="chart-canvas-container">
                    <Line 
                      data={lineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: '#f5f5f5',
                              font: {
                                size: 14
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: '#f5f5f5',
                              maxRotation: 45,
                              minRotation: 45
                            },
                            grid: {
                              color: '#e8e8e8'
                            },
                            border: {
                              color: '#f0f0f0'
                            }
                          },
                          y: {
                            ticks: {
                              color: '#f5f5f5'
                            },
                            grid: {
                              color: '#e8e8e8'
                            },
                            border: {
                              color: '#f0f0f0'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-center font-bold text-lg my-md">
                    Всего потрачено: {totalSum.toFixed(2)} BYN
                  </p>
                </>
              )}
            </div>
            
            <div className="chart-item">
              <h3 className="chart-title">По категориям</h3>
              {pieData && (
                <div className="chart-canvas-container">
                  <Pie 
                    data={pieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                                              plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: '#f5f5f5',
                              font: {
                                size: 14
                              }
                            }
                          }
                        }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
