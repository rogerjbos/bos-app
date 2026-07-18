import React from 'react';
import { useLocation } from 'react-router-dom';

const HomePage: React.FC = () => {
    const location = useLocation();
    const errorMessage = location.state?.message;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
                        Bos Research LLC
                    </h1>

                    {errorMessage && (
                        <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg">
                            <div className="flex items-center justify-center">
                                <div className="text-red-700 dark:text-red-400 font-medium">
                                    {errorMessage}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8">

                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
