import { useState } from 'react';
import { BerthRecord } from '../types/berth';
import { calculateOccupancyTrend } from '../utils/dataUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OccupancyTrendChartProps {
  data: BerthRecord[];
}

type TrendMetric = 'occupancyPercentage' | 'occupied' | 'available' | 'booked';
type Aggregation = 'daily' | 'monthly' | 'yearly';

export default function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
  const [metric, setMetric] = useState<TrendMetric>('occupancyPercentage');
  const [aggregation, setAggregation] = useState<Aggregation>('daily');

  const trendData = calculateOccupancyTrend(data, aggregation);

  const getMetricLabel = () => {
    switch (metric) {
      case 'occupancyPercentage': return 'Occupancy %';
      case 'occupied': return 'Occupied';
      case 'available': return 'Available';
      case 'booked': return 'Booked';
    }
  };

  const getMetricColor = () => {
    switch (metric) {
      case 'occupancyPercentage': return '#1e40af';
      case 'occupied': return '#dc2626';
      case 'available': return '#16a34a';
      case 'booked': return '#ea580c';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="card">
      <div className="card-header flex justify-between items-start">
        <h3 className="card-title">Occupancy Trend</h3>
        <div className="flex space-x-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TrendMetric)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="occupancyPercentage">Occupancy %</option>
            <option value="occupied">Occupied</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
          </select>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as Aggregation)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label: any) => formatDate(label)}
            formatter={(value: any, name: string) => {
              if (name === 'occupancyPercentage') return [`${value.toFixed(1)}%`, 'Occupancy'];
              return [value, name];
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={getMetricColor()}
            strokeWidth={2}
            dot={{ r: 4 }}
            name={getMetricLabel()}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}