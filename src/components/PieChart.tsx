import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartOptions } from '../types';

interface PieChartProps {
  data: ChartOptions;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  return (
    <ReactECharts
      option={data}
      style={{ height: '300px', width: '100%' }}
    />
  );
};

export default PieChart;