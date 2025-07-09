import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

const AdminDashboard = ({ 
  t, 
  openAddPurchaseModal, 
  setSection,
  admin,
  setShowSettingsModal
}) => {
  const { reloadApp, loading } = useData();
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      const success = await reloadApp();
      if (!success) {
        console.error('❌ Failed to reload application');
      }
    } catch (error) {
      console.error('❌ Error during reload:', error);
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              📊 {t.businessOverview}
            </h1>
            <p className="text-blue-100 text-lg">
              {t.dashboardWelcome}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Add Purchase */}
        <button
          onClick={() => openAddPurchaseModal()}
          className="p-6 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-2xl hover:from-green-500 hover:to-emerald-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">➕</span>
          <span className="font-semibold">{t.addPurchase}</span>
        </button>

        {/* Company Debts */}
        <button
          onClick={() => setSection('companyDebts')}
          className="p-6 bg-gradient-to-br from-red-400 to-pink-500 text-white rounded-2xl hover:from-red-500 hover:to-pink-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🏢</span>
          <span className="font-semibold">{t.companyDebts}</span>
        </button>

        {/* Customer Debts */}
        <button
          onClick={() => setSection('customerDebts')}
          className="p-6 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-2xl hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">👥</span>
          <span className="font-semibold">{t.customerDebts}</span>
        </button>

        {/* Products */}
        <button
          onClick={() => setSection('active')}
          className="p-6 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-2xl hover:from-blue-500 hover:to-indigo-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">📱</span>
          <span className="font-semibold">{t.products}</span>
        </button>

        {/* Accessories */}
        <button
          onClick={() => setSection('accessories')}
          className="p-6 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-2xl hover:from-purple-500 hover:to-pink-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🎧</span>
          <span className="font-semibold">{t.accessories}</span>
        </button>

        {/* Sales History */}
        <button
          onClick={() => setSection('history')}
          className="p-6 bg-gradient-to-br from-teal-400 to-cyan-500 text-white rounded-2xl hover:from-teal-500 hover:to-cyan-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">📊</span>
          <span className="font-semibold">{t.salesHistory}</span>
        </button>

        {/* Buying History */}
        <button
          onClick={() => setSection('buyingHistory')}
          className="p-6 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🛒</span>
          <span className="font-semibold">{t.buyingHistory}</span>
        </button>

        {/* Monthly Reports */}
        <button
          onClick={() => setSection('monthlyReports')}
          className="p-6 bg-gradient-to-br from-indigo-400 to-purple-500 text-white rounded-2xl hover:from-indigo-500 hover:to-purple-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">📅</span>
          <span className="font-semibold">{t.monthlyReports}</span>
        </button>

        {/* Personal Loans */}
        <button
          onClick={() => setSection('personalLoans')}
          className="p-6 bg-gradient-to-br from-gray-400 to-gray-600 text-white rounded-2xl hover:from-gray-500 hover:to-gray-700 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">💰</span>
          <span className="font-semibold">{t.personalLoans}</span>
        </button>

        {/* Archived Items */}
        <button
          onClick={() => setSection('archived')}
          className="p-6 bg-gradient-to-br from-slate-400 to-gray-500 text-white rounded-2xl hover:from-slate-500 hover:to-gray-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">📦</span>
          <span className="font-semibold">{t.archivedItems}</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-6 bg-gradient-to-br from-zinc-400 to-stone-500 text-white rounded-2xl hover:from-zinc-500 hover:to-stone-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">⚙️</span>
          <span className="font-semibold">{t.settings}</span>
        </button>

        {/* Reload App */}
        <button
          onClick={handleReload}
          disabled={reloading || loading}
          className="p-6 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-2xl hover:from-emerald-500 hover:to-green-600 transition-all duration-200 shadow-lg flex flex-col items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-400 disabled:hover:to-green-500"
        >
          <span className={`text-4xl transition-transform ${reloading || loading ? 'animate-spin' : 'group-hover:scale-110'}`}>
            🔄
          </span>
          <span className="font-semibold">
            {reloading || loading ? t.reloading : t.reload}
          </span>
        </button>

      </div>
    </div>
  );
};

export default AdminDashboard;
