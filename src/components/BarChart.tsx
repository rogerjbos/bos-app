import React, { useContext } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartOptions } from '../types';
import { ThemeContext } from '../context/ThemeContext';

interface BarChartProps {
  data: ChartOptions;
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const { theme } = useContext(ThemeContext);
  
  const chartTheme = {
    ...data,
    backgroundColor: theme === 'dark' ? '#333' : '#fff',
    textStyle: {
      color: theme === 'dark' ? '#ddd' : '#333'
    }
  };

  return (
    <ReactECharts
      option={chartTheme}
      style={{ height: '300px', width: '100%' }}
      theme={theme}
    />
  );
};

export default BarChart;