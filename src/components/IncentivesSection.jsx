import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/exchangeRates';
import { playSuccessSound, playErrorSound, playModalOpenSound, playModalCloseSound } from '../utils/sounds';
import { Icon } from '../utils/icons.jsx';

const IncentivesSection = ({ t, admin, triggerCloudBackup }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    amount: '',
    description: '',
    currency: 'IQD'
  });
  const [loading, setLoading] = useState(false);

  const { incentives, refreshIncentives } = useData();

  // Filter incentives by search term
  const filteredIncentives = useMemo(() => {
    return incentives.filter(incentive => 
      incentive?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incentive?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [incentives, searchTerm]);

  // Group incentives by company name
  const groupedIncentives = useMemo(() => {
    const groups = filteredIncentives.reduce((acc, incentive) => {
      const companyName = incentive.company_name.charAt(0).toUpperCase() + incentive.company_name.slice(1).toLowerCase();
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(incentive);
      return acc;
    }, {});

    // Sort companies alphabetically
    return Object.keys(groups)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(companyName => ({
        companyName,
        incentives: groups[companyName].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }));
  }, [filteredIncentives]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredIncentives.reduce((acc, incentive) => {
      if (incentive.currency === 'USD') {
        acc.USD += incentive.amount;
      } else {
        acc.IQD += incentive.amount;
      }
      return acc;
    }, { USD: 0, IQD: 0 });
  }, [filteredIncentives]);

  const handleOpenAddModal = (companyName = '') => {
    setFormData({
      company_name: companyName,
      amount: '',
      description: '',
      currency: 'IQD'
    });
    setEditingIncentive(null);
    setShowAddModal(true);
    playModalOpenSound();
  };

  const handleEditIncentive = (incentive) => {
    setFormData({
      company_name: incentive.company_name,
      amount: incentive.amount.toString(),
      description: incentive.description || '',
      currency: incentive.currency
    });
    setEditingIncentive(incentive);
    setShowAddModal(true);
    playModalOpenSound();
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingIncentive(null);
    playModalCloseSound();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_name.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      admin.setToast(t.fillRequiredFields || 'Please fill all required fields', 'error');
      playErrorSound();
      return;
    }

    setLoading(true);
    
    try {
      const incentiveData = {
        company_name: formData.company_name.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        currency: formData.currency
      };

      let result;
      if (editingIncentive) {
        result = await window.api.updateIncentive(editingIncentive.id, incentiveData);
      } else {
        result = await window.api.addIncentive(incentiveData);
      }

      if (result.success) {
        playSuccessSound();
        admin.setToast(editingIncentive ? (t.incentiveUpdated || 'Incentive updated successfully') : (t.incentiveAdded || 'Incentive added successfully'), 'success');
        await refreshIncentives();
        await triggerCloudBackup();
        handleCloseModal();
      } else {
        playErrorSound();
        admin.setToast(result.message || (t.operationFailed || 'Operation failed'), 'error');
      }
    } catch (error) {
      console.error('Error saving incentive:', error);
      playErrorSound();
      admin.setToast(t.operationFailed || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (incentive) => {
    if (!window.confirm(t.confirmDelete || `Are you sure you want to remove this incentive for ${incentive.company_name}?`)) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await window.api.removeIncentive(incentive.id);
      
      if (result.success) {
        playSuccessSound();
        admin.setToast(t.incentiveRemoved || 'Incentive removed successfully', 'success');
        await refreshIncentives();
        await triggerCloudBackup();
      } else {
        playErrorSound();
        admin.setToast(result.message || (t.operationFailed || 'Operation failed'), 'error');
      }
    } catch (error) {
      console.error('Error removing incentive:', error);
      playErrorSound();
      admin.setToast(t.operationFailed || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
            <Icon name="incentives" size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.incentives || 'Incentives'}
            </h1>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold shadow-lg"
          >
            <Icon name="add" size={20} />
            {t.addIncentive || 'Add Incentive'}
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="relative mb-6">
          <input
            type="text"
            placeholder={t.searchIncentives || 'Search incentives by company or description...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="search" size={20} className="text-gray-400" />
          </div>
        </div>

      {/* Totals Summary */}
      {(totals.USD > 0 || totals.IQD > 0) && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {t.totalIncentives || 'Total Incentives'}:
            </span>
            {totals.USD > 0 && (
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(totals.USD, 'USD')}
              </span>
            )}
            {totals.IQD > 0 && (
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(totals.IQD, 'IQD')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Incentives List */}
      {filteredIncentives.length === 0 ? (
        <div className="text-center text-gray-400 py-6">
          {searchTerm ? (t.noMatchingIncentives || 'No matching incentives found') : (t.noIncentives || 'No incentives added yet')}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedIncentives.map(({ companyName, incentives: companyIncentives }) => {
            const companyTotal = companyIncentives.reduce((acc, inc) => {
              if (inc.currency === 'USD') {
                acc.USD += inc.amount;
              } else {
                acc.IQD += inc.amount;
              }
              return acc;
            }, { USD: 0, IQD: 0 });

            return (
              <div key={companyName} className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden mb-6">
                {/* Company Header */}
                <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                          {companyName}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {companyIncentives.length} {companyIncentives.length === 1 ? (t.incentive || 'incentive') : (t.incentives || 'incentives')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddModal(companyName)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-md"
                        title={t.addAnotherIncentive || `Add another incentive for ${companyName}`}
                        disabled={loading}
                      >
                        <Icon name="add" size={16} />
                        <span className="hidden sm:inline">{t.addMore || 'Add More'}</span>
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {companyTotal.USD > 0 && formatCurrency(companyTotal.USD, 'USD')}
                        {companyTotal.USD > 0 && companyTotal.IQD > 0 && ' • '}
                        {companyTotal.IQD > 0 && formatCurrency(companyTotal.IQD, 'IQD')}
                      </div>
                      <div className="text-green-600 dark:text-green-400 text-sm">
                        {t.totalIncentives || 'Total Incentives'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Incentives List */}
                <div className="p-6 space-y-4">
                  {companyIncentives.map((incentive) => (
                    <div 
                      key={incentive.id} 
                      className="rounded-xl p-4 border-2 border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon name="success" size={12} className="text-green-500" />
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">
                              {formatCurrency(incentive.amount, incentive.currency)}
                            </span>
                          </div>
                          
                          {incentive.description && (
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                              {incentive.description}
                            </p>
                          )}
                          
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t.added || 'Added'}: {new Date(incentive.created_at).toLocaleDateString()} {new Date(incentive.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleEditIncentive(incentive)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            disabled={loading}
                          >
                            <Icon name="edit" size={14} />
                            {t.edit || 'Edit'}
                          </button>
                          <button
                            onClick={() => handleRemove(incentive)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                            disabled={loading}
                          >
                            <Icon name="delete" size={14} />
                            {t.remove || 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editingIncentive ? (t.editIncentive || 'Edit Incentive') : (t.addIncentive || 'Add Incentive')}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.companyName || 'Company Name'} *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.amount || 'Amount'} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    required
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <option value="IQD">{t?.iqd || 'IQD'}</option>
                    <option value="USD">{t?.usd || 'USD'}</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.description || 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  rows="3"
                  placeholder={t.incentiveDescriptionPlaceholder || 'Enter description for this incentive...'}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition font-medium"
                  disabled={loading}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (t.saving || 'Saving...') : (editingIncentive ? (t.update || 'Update') : (t.add || 'Add'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default IncentivesSection;
