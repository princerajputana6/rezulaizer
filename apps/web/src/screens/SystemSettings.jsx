'use client';
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Upload,
  Download
} from 'lucide-react';

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSettings, setEditingSettings] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (searchTerm) queryParams.append('search', searchTerm);

      const response = await fetch(`/api/system-settings?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/system-settings/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [selectedCategory, searchTerm]);

  // Handle setting update
  const handleUpdateSetting = async (key, value) => {
    try {
      const response = await fetch(`/api/system-settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        fetchSettings();
        setEditingSettings(prev => ({ ...prev, [key]: false }));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    const settingsToUpdate = Object.entries(editingSettings)
      .filter(([key, isEditing]) => isEditing)
      .map(([key]) => ({
        key,
        value: document.getElementById(`setting-${key}`).value
      }));

    if (settingsToUpdate.length === 0) return;

    try {
      const response = await fetch('/api/system-settings/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      if (response.ok) {
        fetchSettings();
        setEditingSettings({});
      }
    } catch (error) {
      console.error('Error bulk updating settings:', error);
    }
  };

  // Handle reset to default
  const handleResetToDefault = async (key) => {
    if (!window.confirm('Are you sure you want to reset this setting to its default value?')) return;

    try {
      const response = await fetch(`/api/system-settings/${key}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error('Error resetting setting:', error);
    }
  };

  // Render setting input based on data type
  const renderSettingInput = (setting) => {
    const isEditing = editingSettings[setting.key];
    const inputId = `setting-${setting.key}`;

    if (!isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-gray-900 font-medium">
            {setting.dataType === 'boolean' 
              ? (setting.value ? 'Enabled' : 'Disabled')
              : String(setting.value)
            }
          </span>
          <button
            onClick={() => setEditingSettings(prev => ({ ...prev, [setting.key]: true }))}
            className="text-blue-600 hover:text-blue-900 p-1"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      );
    }

    switch (setting.dataType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <select
              id={inputId}
              defaultValue={setting.value}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <button
              onClick={() => handleUpdateSetting(setting.key, document.getElementById(inputId).value === 'true')}
              className="text-green-600 hover:text-green-900 p-1"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              id={inputId}
              type="number"
              defaultValue={setting.value}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 w-32"
              min={setting.validation?.min}
              max={setting.validation?.max}
            />
            <button
              onClick={() => handleUpdateSetting(setting.key, Number(document.getElementById(inputId).value))}
              className="text-green-600 hover:text-green-900 p-1"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        );

      case 'json':
      case 'array':
        return (
          <div className="flex items-center space-x-2">
            <textarea
              id={inputId}
              defaultValue={JSON.stringify(setting.value, null, 2)}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 w-64 h-20 text-sm font-mono"
            />
            <button
              onClick={() => {
                try {
                  const value = JSON.parse(document.getElementById(inputId).value);
                  handleUpdateSetting(setting.key, value);
                } catch (error) {
                  alert('Invalid JSON format');
                }
              }}
              className="text-green-600 hover:text-green-900 p-1"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        );

      default:
        return (
          <div className="flex items-center space-x-2">
            <input
              id={inputId}
              type="text"
              defaultValue={setting.value}
              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 w-64"
              maxLength={setting.validation?.maxLength}
            />
            <button
              onClick={() => handleUpdateSetting(setting.key, document.getElementById(inputId).value)}
              className="text-green-600 hover:text-green-900 p-1"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        );
    }
  };

  const hasEditingSettings = Object.values(editingSettings).some(Boolean);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        
        <div className="flex space-x-3 mt-4 lg:mt-0">
          {hasEditingSettings && (
            <button
              onClick={handleBulkUpdate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save All</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Setting</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Settings by Category */}
      <div className="space-y-6">
        {Object.entries(settings).map(([category, categorySettings]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{setting.key}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          setting.dataType === 'string' ? 'bg-blue-100 text-blue-800' :
                          setting.dataType === 'number' ? 'bg-green-100 text-green-800' :
                          setting.dataType === 'boolean' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {setting.dataType}
                        </span>
                      </div>
                      {setting.description && (
                        <p className="text-sm text-gray-600 mb-2">{setting.description}</p>
                      )}
                      <div className="flex items-center space-x-4">
                        {renderSettingInput(setting)}
                        {setting.defaultValue !== undefined && (
                          <button
                            onClick={() => handleResetToDefault(setting.key)}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="Reset to default"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && Object.keys(settings).length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first system setting'
            }
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
          >
            Add Setting
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;