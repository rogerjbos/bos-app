// src/pages/ReportsPage.tsx
import React, { useEffect, useState } from 'react';

interface Report {
  name: string;
  path: string;
}

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  
  useEffect(() => {
    // You could provide this data from your Python script in a JSON file
    // or fetch it from a simple API
    const availableReports = [
      { name: 'ONJ Status', path: '/reports/onj.html'},
      // { name: 'ONJ Rmd Status', path: '/reports/onj_markdown.html'},
      // Add more reports as they're generated
    ];
    
    setReports(availableReports);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Generated Reports</h1>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.map((report, index) => (
              <li key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {report.name}
                    </h5>
                    {/* <small className="text-sm text-gray-500 dark:text-gray-400">Generated: {report.date}</small> */}
                  </div>
                  <div className="flex-shrink-0">
                    <a 
                      href={report.path} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                    >
                      View Report
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;