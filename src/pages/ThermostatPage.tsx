import { useEffect, useState } from 'react';
import { getAuthHeaders } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ThermostatTime {
  day: number;
  hour: number;
  minute: number;
}

interface ThermostatStatus {
  temp: number;
  t_heat: number;
  t_cool?: number;
  tmode: number;
  fmode: number;
  override: number;
  hold: number;
  tstate: number;
  fstate: number;
  time: ThermostatTime;
}

const THERMOSTAT_MODES = {
  0: 'Off',
  1: 'Heat',
  2: 'Cool',
  3: 'Auto'
};

const ThermostatPage = () => {
  const [activeTab, setActiveTab] = useState<'downstairs' | 'upstairs'>('downstairs');
  const [downstairsStatus, setDownstairsStatus] = useState<ThermostatStatus | null>(null);
  const [upstairsStatus, setUpstairsStatus] = useState<ThermostatStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [targetTemp, setTargetTemp] = useState<number>(70);
  const [timeLoading, setTimeLoading] = useState(false);

  const currentStatus = activeTab === 'downstairs' ? downstairsStatus : upstairsStatus;

  const getThermostatStatus = async (location: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/status`, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[Status] ${location}:`, data);

        if (location === 'downstairs') {
          setDownstairsStatus(data);
        } else {
          setUpstairsStatus(data);
        }

        // Update target temp input to match current setting
        if (data.tmode === 1 && data.t_heat) {
          setTargetTemp(Math.round(data.t_heat));
        } else if (data.tmode === 2 && data.t_cool) {
          setTargetTemp(Math.round(data.t_cool));
        }

        return data;
      } else {
        console.error(`Failed to get status for ${location}: ${response.status}`);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching thermostat status for ${location}:`, error);
      return null;
    }
  };

  const setThermostatTemperature = async (location: string, temp: number) => {
    setLoading(true);
    setMessage('');
    try {
      const status = location === 'downstairs' ? downstairsStatus : upstairsStatus;

      // Determine which parameter to send based on mode
      const payload: any = {};
      if (status?.tmode === 1) {
        payload.t_heat = temp;
      } else if (status?.tmode === 2) {
        payload.t_cool = temp;
      } else {
        setMessage('Thermostat must be in Heat or Cool mode to set temperature');
        setLoading(false);
        return;
      }

      console.log(`[Set Temp] ${location}:`, payload);
      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage(`Temperature set to ${temp}°F successfully`);
        // Refresh status after a moment
        setTimeout(() => getThermostatStatus(location), 1000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(`Failed to set temperature: ${response.status}`);
        console.error('Error response:', errorData);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const setThermostatMode = async (location: string, mode: number) => {
    setLoading(true);
    setMessage('');
    try {
      const payload = { tmode: mode };
      console.log(`[Set Mode] ${location}:`, payload);

      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage(`Mode changed to ${THERMOSTAT_MODES[mode as keyof typeof THERMOSTAT_MODES]} successfully`);
        setTimeout(() => getThermostatStatus(location), 1000);
      } else {
        setMessage(`Failed to set mode: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleHold = async (location: string) => {
    setLoading(true);
    setMessage('');
    try {
      const status = location === 'downstairs' ? downstairsStatus : upstairsStatus;
      const newHold = status?.hold ? 0 : 1;

      const payload = { hold: newHold };
      console.log(`[Toggle Hold] ${location}:`, payload);

      const response = await fetch(`${API_BASE_URL}/thermostat/${location}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage(`Hold ${newHold ? 'enabled' : 'disabled'} successfully`);
        setTimeout(() => getThermostatStatus(location), 1000);
      } else {
        setMessage(`Failed to toggle hold: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const syncThermostatTime = async (location: string) => {
    setTimeLoading(true);
    setMessage('');
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
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
          ...getAuthHeaders(),
        },
        body: JSON.stringify(timeData),
      });

      if (response.ok) {
        setMessage('Thermostat time synchronized successfully');
        setTimeout(() => getThermostatStatus(location), 500);
      } else {
        setMessage(`Failed to sync time: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error syncing time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeLoading(false);
    }
  };

  const formatTime = (time: ThermostatTime | null): string => {
    if (!time) return 'Unknown';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayName = days[time.day] || 'Unknown';
    return `${dayName} ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };

  const refreshStatus = async () => {
    await getThermostatStatus(activeTab);
  };

  // Load status when tab changes
  useEffect(() => {
    refreshStatus();
  }, [activeTab]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Thermostat Control</h1>

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

      {/* Status Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Status</h2>
          <button
            onClick={refreshStatus}
            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Current Temp</div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {currentStatus ? `${currentStatus.temp}°F` : '--'}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Target Temp</div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {currentStatus ? (
                currentStatus.tmode === 1 ? `${currentStatus.t_heat}°F` :
                currentStatus.tmode === 2 ? `${currentStatus.t_cool}°F` : '--'
              ) : '--'}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Mode</div>
            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {currentStatus ? THERMOSTAT_MODES[currentStatus.tmode as keyof typeof THERMOSTAT_MODES] : '--'}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {currentStatus?.tstate === 1 ? '🔥 Heating' : currentStatus?.tstate === 2 ? '❄️ Cooling' : 'Idle'}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Status</div>
            <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 mt-2">
              {currentStatus?.override === 1 && <div>🔓 Override</div>}
              {currentStatus?.hold === 1 && <div>⏸️ Hold</div>}
              {currentStatus?.override === 0 && currentStatus?.hold === 0 && <div>📅 Schedule</div>}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {currentStatus ? formatTime(currentStatus.time) : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Temperature Control</h2>

        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Set Temperature:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTargetTemp(Math.max(50, targetTemp - 1))}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <input
              type="number"
              value={targetTemp}
              onChange={(e) => setTargetTemp(Number(e.target.value))}
              min="50"
              max="90"
              className="w-20 px-3 py-2 text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">°F</span>

            <button
              onClick={() => setTargetTemp(Math.min(90, targetTemp + 1))}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setThermostatTemperature(activeTab, targetTemp)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Setting...' : 'Set Temperature'}
          </button>
        </div>
      </div>

      {/* Mode & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Mode & Controls</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(THERMOSTAT_MODES).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setThermostatMode(activeTab, Number(mode))}
              disabled={loading || currentStatus?.tmode === Number(mode)}
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                currentStatus?.tmode === Number(mode)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => toggleHold(activeTab)}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              currentStatus?.hold === 1
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {currentStatus?.hold === 1 ? '⏸️ Hold On' : '▶️ Hold Off'}
          </button>

          <button
            onClick={() => syncThermostatTime(activeTab)}
            disabled={timeLoading}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {timeLoading ? 'Syncing...' : '🕐 Sync Time'}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-md p-4 ${
          message.includes('success') || message.includes('successfully')
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default ThermostatPage;
