'use client';

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateFilterProps {
  onDateChange: (startDate: Date | null, endDate: Date | null) => void;
  onLoadAllData?: () => void;
  onLoadData?: () => void;
  isLoading?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

export default function DateFilter({ onDateChange, onLoadAllData, onLoadData, isLoading, startDate, endDate }: DateFilterProps) {
  const [localStartDate, setLocalStartDate] = useState<Date | null>(startDate || null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(endDate || null);

  // Sync local state with parent state when props change
  React.useEffect(() => {
    setLocalStartDate(startDate || null);
  }, [startDate]);

  React.useEffect(() => {
    setLocalEndDate(endDate || null);
  }, [endDate]);

  const handleStartDateChange = (date: Date | null) => {
    setLocalStartDate(date);
    // Use the current localEndDate value
    onDateChange(date, localEndDate);
  };

  const handleEndDateChange = (date: Date | null) => {
    setLocalEndDate(date);
    // Use the current localStartDate value
    onDateChange(localStartDate, date);
  };

  const clearDates = () => {
    setLocalStartDate(null);
    setLocalEndDate(null);
    onDateChange(null, null);
  };

  const setToday = () => {
    const today = new Date();
    setLocalStartDate(today);
    setLocalEndDate(today);
    onDateChange(today, today);
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onDateChange(start, end);
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onDateChange(start, end);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Date</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <DatePicker
            selected={localStartDate}
            onChange={handleStartDateChange}
            selectsStart
            startDate={localStartDate}
            endDate={localEndDate}
            maxDate={new Date()}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            placeholderText="Select start date"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <DatePicker
            selected={localEndDate}
            onChange={handleEndDateChange}
            selectsEnd
            startDate={localStartDate}
            endDate={localEndDate}
            minDate={localStartDate || undefined}
            maxDate={new Date()}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            placeholderText="Select end date"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={setToday}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
        >
          Today
        </button>
        <button
          onClick={setLast7Days}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
        >
          Last 7 Days
        </button>
        <button
          onClick={setLast30Days}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
        >
          Last 30 Days
        </button>
        <button
          onClick={clearDates}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
        {onLoadData && (
          <button
            onClick={onLoadData}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Load Data
              </>
            )}
          </button>
        )}
        {onLoadAllData && (
          <button
            onClick={onLoadAllData}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Load All Data
          </button>
        )}
      </div>
    </div>
  );
}
