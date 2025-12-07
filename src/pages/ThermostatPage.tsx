import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

interface ScheduleEntry {
  start: number;
  heat: number;
}

interface DaySchedule {
  [key: string]: ScheduleEntry[];
}

interface ThermostatSchedule {
  program: {
    heat: DaySchedule;
  };
}

interface ThermostatTime {
  day: number;
  hour: number;
  minute: number;
}

interface ThermostatStatus {
  temp: number;
  t_heat: number;
  time: ThermostatTime;
}

const defaultDownstairsSchedule: ThermostatSchedule = {
  program: {
    heat: {
      mon: [{ start: 360, heat: 65 }, { start: 1080, heat: 62 }],
      tue: [{ start: 360, heat: 65 }, { start: 1080, heat: 62 }],
      wed: [{ start: 360, heat: 65 }, { start: 1080, heat: 62 }],
      thu: [{ start: 360, heat: 65 }, { start: 1080, heat: 62 }],
      fri: [{ start: 360, heat: 65 }, { start: 1080, heat: 62 }],
      sat: [{ start: 480, heat: 65 }, { start: 1200, heat: 62 }],
      sun: [{ start: 480, heat: 65 }, { start: 1200, heat: 62 }],
    },
  },
};

const defaultUpstairsSchedule: ThermostatSchedule = {
  program: {
    heat: {
      mon: [{ start: 1080, heat: 65 }, { start: 1200, heat: 63 }],
      tue: [{ start: 1080, heat: 65 }, { start: 1200, heat: 63 }],
      wed: [{ start: 480, heat: 65 }, { start: 1200, heat: 63 }],
      thu: [{ start: 1080, heat: 65 }, { start: 1200, heat: 63 }],
      fri: [{ start: 1080, heat: 65 }, { start: 1200, heat: 63 }],
      sat: [{ start: 480, heat: 65 }, { start: 1200, heat: 63 }],
      sun: [{ start: 480, heat: 65 }, { start: 1200, heat: 63 }],
    },
  },
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

const ThermostatPage = () => {
  const [activeTab, setActiveTab] = useState<'downstairs' | 'upstairs'>('downstairs');
  const [downstairsSchedule, setDownstairsSchedule] = useState<ThermostatSchedule>(defaultDownstairsSchedule);
  const [upstairsSchedule, setUpstairsSchedule] = useState<ThermostatSchedule>(defaultUpstairsSchedule);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [thermostatTime, setThermostatTime] = useState<ThermostatTime | null>(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [thermostatStatus, setThermostatStatus] = useState<ThermostatStatus | null>(null);

  const updateSchedule = async (location: string, schedule: ThermostatSchedule) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/program`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(schedule),
      });

      if (response.ok) {
        const responseData = await response.json();
        setMessage('Schedule updated successfully.');
      } else {
        setMessage(`Failed to update schedule. Status: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getThermostatProgram = async (location: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/program`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching thermostat program:', error);
      return null;
    }
  };

  const getThermostatTime = async (location: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/time`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching thermostat time:', error);
      return null;
    }
  };

  const getThermostatStatus = async (location: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/status`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setThermostatStatus(data);
        return data;
      } else {
        console.error(`Thermostat ${location} status request failed with status:`, response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching thermostat status:', error);
      return null;
    }
  };

  const syncThermostatTime = async (location: string) => {
    setTimeLoading(true);
    setMessage('');
    try {
      // Get current system time
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert to thermostat format: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
      const thermostatDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const timeData = {
        day: thermostatDay,
        hour: now.getHours(),
        minute: now.getMinutes()
      };

      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(timeData),
      });

      if (response.ok) {
        const responseData = await response.json();
        setThermostatTime(timeData);
        setMessage('Thermostat time synchronized successfully.');
        // Refresh the time display
        await loadThermostatTime();
      } else {
        setMessage(`Failed to sync time. Status: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error syncing time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeLoading(false);
    }
  };

  const loadThermostatTime = async () => {
    const location = activeTab === 'downstairs' ? 'downstairs' : 'upstairs';
    const time = await getThermostatTime(location);
    setThermostatTime(time);
    // Also fetch and log the program data
    await getThermostatProgram(location);
    // Also fetch the status data
    await getThermostatStatus(location);
  };

  const formatTime = (time: ThermostatTime | null): string => {
    if (!time) return 'Unknown';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayName = days[time.day] || 'Unknown';
    return `${dayName} ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };

  // Load thermostat time when tab changes
  useEffect(() => {
    setThermostatStatus(null); // Clear status while loading new data
    setThermostatTime(null); // Clear time while loading new data
    loadThermostatTime();
  }, [activeTab]);

  const handleUpdateDownstairs = () => {
    updateSchedule('downstairs', downstairsSchedule);
  };

  const handleUpdateUpstairs = () => {
    updateSchedule('upstairs', upstairsSchedule);
  };

  const copyMondayToAllDays = (schedule: ThermostatSchedule, setSchedule: (s: ThermostatSchedule) => void) => {
    const mondayEntries = schedule.program.heat.mon;
    const newHeat = { ...schedule.program.heat };

    ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
      newHeat[day] = mondayEntries.map(entry => ({ ...entry }));
    });

    setSchedule({
      ...schedule,
      program: {
        ...schedule.program,
        heat: newHeat,
      },
    });

    setMessage('Copied Monday settings to all days');
    setTimeout(() => setMessage(''), 3000);
  };

  const renderScheduleForm = (schedule: ThermostatSchedule, setSchedule: (s: ThermostatSchedule) => void) => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    return (
      <div className="space-y-3">
        {days.map(day => (
          <div key={day} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">{day.toUpperCase()}</h3>
              {day === 'mon' && (
                <button
                  onClick={() => copyMondayToAllDays(schedule, setSchedule)}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                >
                  Copy to All
                </button>
              )}
            </div>
            <div className="space-y-1">
              {schedule.program.heat[day].map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={minutesToTime(entry.start)}
                    onChange={(e) => {
                      const newStart = timeToMinutes(e.target.value);
                      const newEntries = [...schedule.program.heat[day]];
                      newEntries[index] = { ...newEntries[index], start: newStart };
                      setSchedule({
                        ...schedule,
                        program: {
                          ...schedule.program,
                          heat: {
                            ...schedule.program.heat,
                            [day]: newEntries,
                          },
                        },
                      });
                    }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                  <input
                    type="number"
                    value={entry.heat}
                    onChange={(e) => {
                      const newHeat = Number(e.target.value);
                      const newEntries = [...schedule.program.heat[day]];
                      newEntries[index] = { ...newEntries[index], heat: newHeat };
                      setSchedule({
                        ...schedule,
                        program: {
                          ...schedule.program,
                          heat: {
                            ...schedule.program.heat,
                            [day]: newEntries,
                          },
                        },
                      });
                    }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-16 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Temp"
                  />
                  <button
                    onClick={() => {
                      const newEntries = schedule.program.heat[day].filter((_, i) => i !== index);
                      setSchedule({
                        ...schedule,
                        program: {
                          ...schedule.program,
                          heat: {
                            ...schedule.program.heat,
                            [day]: newEntries,
                          },
                        },
                      });
                    }}
                    className="inline-flex items-center justify-center w-6 h-6 border border-transparent rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    title="Remove entry"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newEntry = { start: 0, heat: 70 }; // default
                  const newEntries = [...schedule.program.heat[day], newEntry];
                  setSchedule({
                    ...schedule,
                    program: {
                      ...schedule.program,
                      heat: {
                        ...schedule.program.heat,
                        [day]: newEntries,
                      },
                    },
                  });
                }}
                className="inline-flex items-center justify-center w-6 h-6 border border-transparent rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                title="Add entry"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };



  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Thermostat Control</h1>

      {/* Time Display Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Thermostat Status & Time</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Current</div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {thermostatStatus ? `${thermostatStatus.temp}°F` : '--'}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Target</div>
            <div className="text-xl font-bold text-green-900 dark:text-green-100">
              {thermostatStatus ? `${thermostatStatus.t_heat}°F` : '--'}
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Thermostat Time</div>
            <div className="text-sm font-mono text-purple-900 dark:text-purple-100">
              {thermostatTime ? formatTime(thermostatTime) : '--'}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">System Time</div>
            <div className="text-sm font-mono text-orange-900 dark:text-orange-100">
              {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadThermostatTime()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Status
          </button>
          <button
            onClick={() => syncThermostatTime(activeTab)}
            disabled={timeLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {timeLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {timeLoading ? 'Syncing...' : 'Sync to System Time'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
            activeTab === 'downstairs'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('downstairs')}
        >
          Downstairs
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
            activeTab === 'upstairs'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('upstairs')}
        >
          Upstairs
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        {activeTab === 'downstairs' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Downstairs Thermostat</h2>
            {renderScheduleForm(downstairsSchedule, setDownstairsSchedule)}
            <button
              onClick={handleUpdateDownstairs}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm mt-3"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              {loading ? 'Updating...' : 'Update Schedule'}
            </button>
          </div>
        )}

        {activeTab === 'upstairs' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upstairs Thermostat</h2>
            {renderScheduleForm(upstairsSchedule, setUpstairsSchedule)}
            <button
              onClick={handleUpdateUpstairs}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm mt-3"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              {loading ? 'Updating...' : 'Update Schedule'}
            </button>
          </div>
        )}

        {message && (
          <div className={message.includes('successfully') ? 'mt-4 p-3 rounded-md bg-green-100 text-green-800' : 'mt-4 p-3 rounded-md bg-red-100 text-red-800'}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThermostatPage;
