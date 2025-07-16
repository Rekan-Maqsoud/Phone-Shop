import React, { useState, useEffect } from 'react';

const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    return `${amount.toLocaleString()} IQD`;
  }
  return `$${amount.toFixed(2)}`;
};

export default function PersonalLoansSection({ admin, t, showConfirm }) {
  const [loans, setLoans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaidLoans, setShowPaidLoans] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    amount: '',
    description: '',
    currency: 'IQD'
  });

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      if (window.api?.getPersonalLoans) {
        const data = await window.api.getPersonalLoans();
        setLoans(data || []);
      }
    } catch (error) {
      console.error('Error fetching personal loans:', error);
    }
  };

  const handleAddLoan = async () => {
    if (!formData.person_name.trim() || !formData.amount || formData.amount <= 0) {
      admin.setToast?.('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await window.api?.addPersonalLoan?.({
        person_name: formData.person_name.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        currency: formData.currency
      });

      if (result?.success) {
        admin.setToast?.(`💰 Loan of ${formatCurrency(parseFloat(formData.amount), formData.currency)} added to ${formData.person_name}`);
        setFormData({ person_name: '', amount: '', description: '', currency: 'IQD' });
        setShowModal(false);
        fetchLoans();
      } else {
        admin.setToast?.('❌ Failed to add loan: ' + (result?.message || result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding loan:', error);
      admin.setToast?.('❌ Error adding loan');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (loan) => {
    setSelectedLoan(loan);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedLoan || processingPayment.has(selectedLoan.id)) {
      return; // Prevent double-clicking
    }

    setProcessingPayment(prev => new Set(prev).add(selectedLoan.id));
    
    try {
      // Calculate payment amounts based on selected currency
      const payment_usd_amount = paymentCurrency === 'USD' ? admin.balanceUSD : 0;
      const payment_iqd_amount = paymentCurrency === 'IQD' ? admin.balanceIQD : 0;
      
      const result = await window.api?.markPersonalLoanPaid?.(
        selectedLoan.id, 
        {
          paid_at: new Date().toISOString(),
          payment_currency_used: paymentCurrency,
          payment_usd_amount: paymentCurrency === 'USD' ? selectedLoan.amount : 0,
          payment_iqd_amount: paymentCurrency === 'IQD' ? selectedLoan.amount : 0
        }
      );
      
      if (result?.success) {
        admin.setToast?.(`💰 Loan payment of ${formatCurrency(selectedLoan.amount, selectedLoan.currency)} received from ${selectedLoan.person_name}`);
        fetchLoans();
        setShowPaymentModal(false);
        setSelectedLoan(null);
      } else {
        admin.setToast?.('❌ Failed to mark loan as paid: ' + (result?.message || result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error marking loan as paid:', error);
      admin.setToast?.('❌ Error marking loan as paid');
    } finally {
      setProcessingPayment(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedLoan.id);
        return newSet;
      });
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (loan.description && loan.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPaidStatus = showPaidLoans ? !!loan.paid_at : !loan.paid_at;
    return matchesSearch && matchesPaidStatus;
  });

  const totalUnpaidUSD = loans.filter(l => !l.paid_at && l.currency === 'USD').reduce((sum, l) => sum + l.amount, 0);
  const totalUnpaidIQD = loans.filter(l => !l.paid_at && l.currency === 'IQD').reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              🤝 {t?.personalLoans || 'Personal Loans'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t?.personalLoansDesc || 'Track money lent to friends and family'}
            </p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            ➕ {t?.addLoan || 'Add Loan'}
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={t?.searchLoans || 'Search loans...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>

          {/* Toggle Paid/Unpaid */}
          <button
            onClick={() => setShowPaidLoans(!showPaidLoans)}
            className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
              showPaidLoans 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {showPaidLoans ? '✅ ' + (t?.paidLoans || 'Paid Loans') : '💰 ' + (t?.activeLoans || 'Active Loans')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!showPaidLoans && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💵</span>
              <span className="text-green-100 text-sm">{t?.outstandingUSD || 'Outstanding USD'}</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalUnpaidUSD, 'USD')}</div>
            <div className="text-green-100 text-sm">{t?.totalLoaned || 'Total Loaned'}</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💰</span>
              <span className="text-orange-100 text-sm">{t?.outstandingIQD || 'Outstanding IQD'}</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalUnpaidIQD, 'IQD')}</div>
            <div className="text-orange-100 text-sm">{t?.totalLoaned || 'Total Loaned'}</div>
          </div>
        </div>
      )}

      {/* Loans List */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow border border-white/20">
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🤝</div>
            <p>{showPaidLoans ? (t?.noPaidLoans || 'No paid loans') : (t?.noActiveLoans || 'No active loans')}</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredLoans.map((loan) => (
              <div key={loan.id} className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                      {loan.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {loan.person_name}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(loan.created_at).toLocaleDateString()}
                        {loan.description && (
                          <span> • {loan.description}</span>
                        )}
                      </div>
                      {loan.paid_at && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          ✅ {t?.paidOn || 'Paid on'} {new Date(loan.paid_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        loan.paid_at 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-purple-600 dark:text-purple-400'
                      }`}>
                        {formatCurrency(loan.amount, loan.currency)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        loan.paid_at 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {loan.paid_at ? (t?.paid || 'Paid') : (t?.active || 'Active')}
                      </div>
                    </div>
                    
                    {!loan.paid_at && (
                      <button
                        onClick={() => handleMarkPaid(loan)}
                        disabled={processingPayment.has(loan.id)}
                        className={`px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 ${
                          processingPayment.has(loan.id)
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {processingPayment.has(loan.id) ? (
                          <>⏳ {t?.processing || 'Processing...'}</>
                        ) : (
                          <>💰 {t?.markPaid || 'Mark Paid'}</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ➕ {t?.addPersonalLoan || 'Add Personal Loan'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.borrowerName || 'Borrower Name'} *
                </label>
                <input
                  type="text"
                  value={formData.person_name}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t?.enterBorrowerName || 'Enter borrower name'}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.amount || 'Amount'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.currency || 'Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="IQD">� IQD</option>
                    <option value="USD">� USD</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.description || 'Description'} ({t?.optional || 'Optional'})
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t?.enterDescription || 'Enter description...'}
                  rows="3"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ person_name: '', amount: '', description: '', currency: 'IQD' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleAddLoan}
                disabled={loading || !formData.person_name.trim() || !formData.amount || formData.amount <= 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? (t?.adding || 'Adding...') : (t?.addLoan || 'Add Loan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Currency Selection Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                💰 {t?.selectPaymentCurrency || 'Select Payment Currency'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t?.markingLoanPaidFor || 'Marking loan as paid for'} <strong>{selectedLoan.person_name}</strong>
              </p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-1">
                {t?.loanAmount || 'Loan Amount'}: {formatCurrency(selectedLoan.amount, selectedLoan.currency)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t?.selectCurrencyToAdd || 'Select which currency to add to your balance:'}
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="paymentCurrency"
                      value="USD"
                      checked={paymentCurrency === 'USD'}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">💵 {t?.usdBalance || 'USD Balance'}</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${admin.balanceUSD?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="paymentCurrency"
                      value="IQD"
                      checked={paymentCurrency === 'IQD'}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">💰 {t?.iqdBalance || 'IQD Balance'}</span>
                        <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          د.ع{admin.balanceIQD?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedLoan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t?.cancel || 'Cancel'}
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment.has(selectedLoan.id)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                💰 {t?.markAsPaid || 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
