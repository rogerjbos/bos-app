import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

// Define a type for chart options
type ChartOptions = any; // Replace with actual type from echarts if available

const ChartsPage: React.FC = () => {
    // Check for dark mode to adjust chart colors
    const [darkMode, setDarkMode] = useState<boolean>(false);
    
    useEffect(() => {
        // Check dark mode from localStorage or body class
        const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                          document.body.classList.contains('dark-mode');
        setDarkMode(isDarkMode);
        
        // Listen for changes to dark mode
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isDark = document.body.classList.contains('dark-mode');
                    setDarkMode(isDark);
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        
        return () => observer.disconnect();
    }, []);
    
    // Theme colors based on dark mode
    const textColor = darkMode ? '#e0e0e0' : '#333';
    const axisLineColor = darkMode ? '#555' : '#ccc';
    const splitLineColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const backgroundColor = darkMode ? 'transparent' : 'transparent';
    
    // Base chart options that apply to all charts
    const baseOptions = {
        textStyle: {
            color: textColor
        },
        xAxis: {
            axisLine: {
                lineStyle: {
                    color: axisLineColor
                }
            },
            splitLine: {
                lineStyle: {
                    color: splitLineColor
                }
            }
        },
        yAxis: {
            axisLine: {
                lineStyle: {
                    color: axisLineColor
                }
            },
            splitLine: {
                lineStyle: {
                    color: splitLineColor
                }
            }
        },
        backgroundColor: backgroundColor
    };
    
    const barChartData: ChartOptions = {
        ...baseOptions,
        xAxis: {
            ...baseOptions.xAxis,
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            ...baseOptions.yAxis,
            type: 'value'
        },
        series: [
            {
                data: [120, 200, 150, 80, 70, 110, 130],
                type: 'bar',
                itemStyle: {
                    color: '#007bff'
                }
            }
        ]
    };

    const lineChartData: ChartOptions = {
        ...baseOptions,
        xAxis: {
            ...baseOptions.xAxis,
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            ...baseOptions.yAxis,
            type: 'value'
        },
        series: [
            {
                data: [150, 230, 224, 218, 135, 147, 260],
                type: 'line',
                itemStyle: {
                    color: '#28a745'
                }
            }
        ]
    };
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Charts</h1>
                            
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bar Chart</h3>
                        </div>
                        <div className="p-6">
                            <ReactECharts option={barChartData} style={{ height: '300px' }} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Line Chart</h3>
                        </div>
                        <div className="p-6">
                            <ReactECharts option={lineChartData} style={{ height: '300px' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartsPage;