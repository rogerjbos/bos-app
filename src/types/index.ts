export interface ChartData {
    name: string;
    value: number;
}

export interface ChartOptions {
    title?: string;
    tooltip?: any;
    legend?: boolean;
    xAxis?: any;
    yAxis?: any;
    series?: any[];
    [key: string]: any;  // For any other ECharts options
}