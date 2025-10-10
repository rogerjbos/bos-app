import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartOptions } from '../types';

interface LineChartProps {
  data: ChartOptions;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  return (
    <ReactECharts
      option={data}
      style={{ height: '300px', width: '100%' }}
    />
  );
};

export default LineChart;