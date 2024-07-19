import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { readExcel } from './excelUtils';

const generateDummyData = () => {
  const months = ['01', '02', '03', '04', '05', '06'];
  const years = ['2024'];
  let data = [];
  let prevARR = 3000000;
  let prevCustomers = 150;

  years.forEach(year => {
    months.forEach((month, index) => {
      const newCustomers = Math.floor(Math.random() * 10) + 5;
      const churnedCustomers = Math.floor(Math.random() * 5);
      const currentCustomers = prevCustomers + newCustomers - churnedCustomers;

      const newMRR = newCustomers * 2000;
      const churnMRR = churnedCustomers * 2000;
      const expansionMRR = Math.floor(Math.random() * 50000) + 10000;
      const contractionMRR = Math.floor(Math.random() * 20000);
      const reactivationMRR = Math.floor(Math.random() * 10000);

      const netMRR = newMRR + expansionMRR + reactivationMRR - churnMRR - contractionMRR;
      const currentARR = prevARR + netMRR * 12;
      const momGrowth = ((currentARR - prevARR) / prevARR) * 100;

      data.push({
        date: `${year}-${month}-01`,
        monthYear: `${['ene', 'feb', 'mar', 'abr', 'may', 'jun'][index]}-${year.slice(2)}`,
        arr: currentARR,
        momGrowth: momGrowth,
        customers: currentCustomers,
        arpa: currentARR / currentCustomers,
        new: newMRR,
        expansion: expansionMRR,
        reactivation: reactivationMRR,
        churn: -churnMRR,
        contraction: -contractionMRR
      });

      prevARR = currentARR;
      prevCustomers = currentCustomers;
    });
  });

  return data;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value) => {
  return new Intl.NumberFormat('es-ES', { 
    style: 'percent', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value / 100);
};

const MetricCard = ({ title, value, change }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    <p className="text-3xl font-bold mt-2">{value}</p>
    <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {change >= 0 ? '+' : ''}{formatPercentage(change)} vs mes anterior
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded shadow">
        <p className="font-bold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'ARR' ? formatCurrency(entry.value) : formatPercentage(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const dummyData = useMemo(() => generateDummyData(), []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonData = await readExcel('/data/saas_data.xlsx');
        setData(jsonData);
      } catch (error) {
        console.error("Error reading excel file:", error);
        setError("Error al leer el archivo Excel. Usando datos de ejemplo.");
        setData(dummyData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dummyData]);

  if (isLoading) {
    return <div className="text-center p-6">Cargando datos...</div>;
  }

  const displayData = data.length > 0 ? data : dummyData;
  const latestData = displayData[displayData.length - 1];
  const previousData = displayData[displayData.length - 2];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">ARR Summary</h1>
      
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard 
          title="ARR" 
          value={formatCurrency(latestData.arr)} 
          change={((latestData.arr - previousData.arr) / previousData.arr) * 100} 
        />
        <MetricCard 
          title="MoM Growth" 
          value={formatPercentage(latestData.momGrowth)}
          change={latestData.momGrowth - previousData.momGrowth} 
        />
        <MetricCard 
          title="Customers" 
          value={latestData.customers.toLocaleString('es-ES')} 
          change={((latestData.customers - previousData.customers) / previousData.customers) * 100} 
        />
        <MetricCard 
          title="ARPA" 
          value={formatCurrency(latestData.arpa)} 
          change={((latestData.arpa - previousData.arpa) / previousData.arpa) * 100} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Total ARR y MoM Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthYear" />
              <YAxis yAxisId="left" tickFormatter={(value) => `€${value / 1000000}M`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="arr" name="ARR" stroke="#4F46E5" />
              <Line yAxisId="right" type="monotone" dataKey="momGrowth" name="MoM Growth" stroke="#10B981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">MRR Movements</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthYear" />
              <YAxis tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(Math.abs(value)), name]}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend />
              <Bar dataKey="new" name="New" stackId="a" fill="#4F46E5" />
              <Bar dataKey="expansion" name="Expansion" stackId="a" fill="#10B981" />
              <Bar dataKey="reactivation" name="Reactivation" stackId="a" fill="#3B82F6" />
              <Bar dataKey="churn" name="Churn" stackId="a" fill="#EF4444" />
              <Bar dataKey="contraction" name="Contraction" stackId="a" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Date</th>
                <th className="p-2">ARR</th>
                <th className="p-2">MoM Growth</th>
                <th className="p-2">Customers</th>
                <th className="p-2">ARPA</th>
                <th className="p-2">New</th>
                <th className="p-2">Expansion</th>
                <th className="p-2">Reactivation</th>
                <th className="p-2">Contraction</th>
                <th className="p-2">Churn</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((month, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="p-2">{month.monthYear}</td>
                  <td className="p-2">{formatCurrency(month.arr)}</td>
                  <td className="p-2">{formatPercentage(month.momGrowth)}</td>
                  <td className="p-2">{month.customers.toLocaleString('es-ES')}</td>
                  <td className="p-2">{formatCurrency(month.arpa)}</td>
                  <td className="p-2">{formatCurrency(month.new)}</td>
                  <td className="p-2">{formatCurrency(month.expansion)}</td>
                  <td className="p-2">{formatCurrency(month.reactivation)}</td>
                  <td className="p-2">{formatCurrency(Math.abs(month.contraction))}</td>
                  <td className="p-2">{formatCurrency(Math.abs(month.churn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;