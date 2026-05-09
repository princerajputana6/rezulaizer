'use client';
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function SchedulePicker({ value, onChange, minDateTime, label = 'Schedule (optional)' }) {
  const [dt, setDt] = useState(value ? new Date(value) : null);

  useEffect(() => {
    if (value) setDt(new Date(value));
  }, [value]);

  const handleChange = (date) => {
    setDt(date);
    if (onChange) onChange(date ? date.toISOString() : null);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <DatePicker
        selected={dt}
        onChange={handleChange}
        showTimeSelect
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="yyyy-MM-dd h:mm aa"
        minDate={minDateTime ? new Date(minDateTime) : new Date()}
        className="input w-full"
        placeholderText="Pick date & time (leave empty to send now)"
        isClearable
      />
      <p className="text-xs text-gray-500">Leave empty to send immediately. Otherwise a scheduled job will be created.</p>
    </div>
  );
}