import React, { useState, useEffect, useMemo } from 'react';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    return `${Math.round(amount).toLocaleString()} IQD`;
  }
  return `$${Number(amount).toFixed(2)}`;
};

export default function PersonalLoansSection({ admin, t, showConfirm }) {
  const [loans, setLoans] = useState([]);
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentAmountUSD, setPaymentAmountUSD] = useState('');
  const [paymentAmountIQD, setPaymentAmountIQD] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaidLoans, setShowPaidLoans] = useState(false);
  const [expandedPersons, setExpandedPersons] = useState(new Set());
  const [formData, setFormData] = useState({
    person_name: '',
    usd_amount: '',
    iqd_amount: '',
    description: '',
  });

  useEffect(() => {
    fetchLoans();
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      if (window.api?.getBalances) {
        const data = await window.api.getBalances();
        setBalances(data || { usd_balance: 0, iqd_balance: 0 });
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

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
    const usdAmount = parseFloat(formData.usd_amount) || 0;
    const iqdAmount = parseFloat(formData.iqd_amount) || 0;
    
    if (!formData.person_name.trim() || (usdAmount <= 0 && iqdAmount <= 0)) {
      admin.setToast?.('❌ Please enter person name and at least one amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const loanData = {
        person_name: formData.person_name.trim(),
        usd_amount: usdAmount,
        iqd_amount: iqdAmount,
        description: formData.description.trim(),
      };

      const result = await window.api?.addPersonalLoan?.(loanData);

      if (result?.success) {
        const amounts = [];
        if (usdAmount > 0) amounts.push(formatCurrency(usdAmount, 'USD'));
        if (iqdAmount > 0) amounts.push(formatCurrency(iqdAmount, 'IQD'));
        
        admin.setToast?.(`💰 Loan of ${amounts.join(' + ')} added to ${formData.person_name}`, 'success');
        setFormData({ person_name: '', usd_amount: '', iqd_amount: '', description: '' });
        setShowModal(false);
        fetchLoans();
        fetchBalances(); // Refresh balances after adding loan
      } else {
        admin.setToast?.('❌ Failed to add loan: ' + (result?.message || result?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error adding loan:', error);
      admin.setToast?.('❌ Error adding loan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (loan) => {
    setSelectedLoan(loan);
    
    // Calculate remaining amounts
    const remainingUSD = (loan.usd_amount || 0) - (loan.payment_usd_amount || 0);
    const remainingIQD = (loan.iqd_amount || 0) - (loan.payment_iqd_amount || 0);
    
    // Set default payment amounts to remaining loan amounts
    setPaymentAmountUSD(remainingUSD > 0 ? remainingUSD.toString() : '');
    setPaymentAmountIQD(remainingIQD > 0 ? remainingIQD.toString() : '');
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedLoan || processingPayment.has(selectedLoan.id)) {
      return;
    }

    const usdPayment = parseFloat(paymentAmountUSD) || 0;
    const iqdPayment = parseFloat(paymentAmountIQD) || 0;
    
    if (usdPayment <= 0 && iqdPayment <= 0) {
      admin.setToast?.('❌ Please enter at least one payment amount', 'error');
      return;
    }

    // Calculate remaining amounts to validate against overpayment
    const remainingUSD = (selectedLoan.usd_amount || 0) - (selectedLoan.payment_usd_amount || 0);
    const remainingIQD = (selectedLoan.iqd_amount || 0) - (selectedLoan.payment_iqd_amount || 0);

    // Validate payment doesn't exceed remaining amounts
    if (usdPayment > remainingUSD) {
      admin.setToast?.(`❌ USD payment of $${usdPayment} exceeds remaining balance of $${remainingUSD}`, 'error');
      return;
    }
    if (iqdPayment > remainingIQD) {
      admin.setToast?.(`❌ IQD payment of ${iqdPayment} IQD exceeds remaining balance of ${remainingIQD} IQD`, 'error');
      return;
    }

    setProcessingPayment(prev => new Set(prev).add(selectedLoan.id));

    try {
      const payload = {
        paid_at: new Date().toISOString(),
        payment_usd_amount: usdPayment,
        payment_iqd_amount: iqdPayment
      };

      const result = await window.api.markPersonalLoanPaid(selectedLoan.id, payload);

      if (result?.success) {
        const amounts = [];
        if (usdPayment > 0) amounts.push(formatCurrency(usdPayment, 'USD'));
        if (iqdPayment > 0) amounts.push(formatCurrency(iqdPayment, 'IQD'));
        
        admin.setToast?.(`💰 Loan payment of ${amounts.join(' + ')} received from ${selectedLoan.person_name}`, 'success');
        fetchLoans();
        fetchBalances(); // Refresh balances after payment
        setShowPaymentModal(false);
        setSelectedLoan(null);
      } else {
        admin.setToast?.('❌ Failed to mark loan as paid: ' + (result?.message || result?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error marking loan as paid:', error);
      admin.setToast?.('❌ Error marking loan as paid', 'error');
    } finally {
      setProcessingPayment(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedLoan.id);
        return newSet;
      });
    }
  };

  // Group loans by person and calculate totals
  const groupedLoans = useMemo(() => {
    const groups = {};
    
    loans.forEach(loan => {
      const personName = loan.person_name;
      if (!groups[personName]) {
        groups[personName] = {
          person_name: personName,
          loans: [],
          totalUSD: 0,
          totalIQD: 0,
          unpaidUSD: 0,
          unpaidIQD: 0,
          paidUSD: 0,
          paidIQD: 0,
        };
      }
      
      groups[personName].loans.push(loan);
      groups[personName].totalUSD += loan.usd_amount || 0;
      groups[personName].totalIQD += loan.iqd_amount || 0;
      
      if (loan.paid_at) {
        groups[personName].paidUSD += loan.usd_amount || 0;
        groups[personName].paidIQD += loan.iqd_amount || 0;
      } else {
        groups[personName].unpaidUSD += loan.usd_amount || 0;
        groups[personName].unpaidIQD += loan.iqd_amount || 0;
      }
    });

    return Object.values(groups);
  }, [loans]);

  const filteredGroups = useMemo(() => {
    return groupedLoans.filter(group => {
      const matchesSearch = group.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.loans.some(loan => loan.description && loan.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const hasMatchingStatus = showPaidLoans 
        ? group.loans.some(loan => !!loan.paid_at)
        : group.loans.some(loan => !loan.paid_at);
      
      return matchesSearch && hasMatchingStatus;
    });
  }, [groupedLoans, searchTerm, showPaidLoans]);

  const totalUnpaidUSD = loans.filter(l => !l.paid_at).reduce((sum, l) => sum + (l.usd_amount || 0), 0);
  const totalUnpaidIQD = loans.filter(l => !l.paid_at).reduce((sum, l) => sum + (l.iqd_amount || 0), 0);

  const togglePersonExpanded = (personName) => {
    setExpandedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personName)) {
        newSet.delete(personName);
      } else {
        newSet.add(personName);
      }
      return newSet;
    });
  };

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
              {t?.personalLoansDesc || 'Track money lent to friends and family with multi-currency support'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🏦</span>
              <span className="text-blue-100 text-sm">{t?.currentBalance || 'Current Balance'}</span>
            </div>
            <div className="text-lg font-bold">
              {formatCurrency(balances.usd_balance, 'USD')}
            </div>
            <div className="text-lg font-bold">
              {formatCurrency(balances.iqd_balance, 'IQD')}
            </div>
          </div>
        </div>
      )}

      {/* Loans List - Grouped by Person */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow border border-white/20">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🤝</div>
            <p>{showPaidLoans ? (t?.noPaidLoans || 'No paid loans') : (t?.noActiveLoans || 'No active loans')}</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.person_name} className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                {/* Person Summary Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => togglePersonExpanded(group.person_name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                        {group.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                          {group.person_name}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {group.loans.length} {group.loans.length === 1 ? 'loan' : 'loans'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {showPaidLoans ? (
                          <div>
                            {group.paidUSD > 0 && (
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                ✅ {formatCurrency(group.paidUSD, 'USD')}
                              </div>
                            )}
                            {group.paidIQD > 0 && (
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                ✅ {formatCurrency(group.paidIQD, 'IQD')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            {group.unpaidUSD > 0 && (
                              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                💰 {formatCurrency(group.unpaidUSD, 'USD')}
                              </div>
                            )}
                            {group.unpaidIQD > 0 && (
                              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                💰 {formatCurrency(group.unpaidIQD, 'IQD')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-2xl text-gray-400 transition-transform duration-200">
                        {expandedPersons.has(group.person_name) ? '⬆️' : '⬇️'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Loans */}
                {expandedPersons.has(group.person_name) && (
                  <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {group.loans
                      .filter(loan => showPaidLoans ? !!loan.paid_at : !loan.paid_at)
                      .map((loan) => (
                        <div key={loan.id} className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(loan.created_at).toLocaleDateString()}
                                </span>
                                {loan.description && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {loan.description}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex gap-4">
                                {(loan.usd_amount || 0) > 0 && (
                                  <div className={`text-lg font-bold ${
                                    loan.paid_at ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                                  }`}>
                                    {formatCurrency(loan.usd_amount, 'USD')}
                                  </div>
                                )}
                                {(loan.iqd_amount || 0) > 0 && (
                                  <div className={`text-lg font-bold ${
                                    loan.paid_at ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                                  }`}>
                                    {formatCurrency(loan.iqd_amount, 'IQD')}
                                  </div>
                                )}
                              </div>
                              
                              {loan.paid_at && (
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  ✅ {t?.paidOn || 'Paid on'} {new Date(loan.paid_at).toLocaleDateString()} {new Date(loan.paid_at).toLocaleTimeString()}
                                  {(loan.payment_usd_amount > 0 || loan.payment_iqd_amount > 0) && (
                                    <span className="ml-2">
                                      (
                                      {loan.payment_usd_amount > 0 && formatCurrency(loan.payment_usd_amount, 'USD')}
                                      {loan.payment_usd_amount > 0 && loan.payment_iqd_amount > 0 && ' + '}
                                      {loan.payment_iqd_amount > 0 && formatCurrency(loan.payment_iqd_amount, 'IQD')}
                                      )
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {!loan.paid_at && (
                              <button
                                onClick={() => handleMarkPaid(loan)}
                                disabled={processingPayment.has(loan.id)}
                                className={`px-3 py-2 rounded-lg transition text-sm flex items-center gap-2 ${
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
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Loan Modal - Multi-Currency Support */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ➕ {t?.addPersonalLoan || 'Add Personal Loan'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Multi-currency loan support - enter amounts in USD and/or IQD
              </p>
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
                    💵 {t?.usdAmount || 'USD Amount'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.usd_amount}
                    onChange={(e) => setFormData({ ...formData, usd_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💰 {t?.iqdAmount || 'IQD Amount'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.iqd_amount}
                    onChange={(e) => setFormData({ ...formData, iqd_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Exchange Rate Info */}
              {(formData.usd_amount || formData.iqd_amount) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    💱 {t?.exchangeRateInfo || 'Exchange Rate Info'}:
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    1 USD = {EXCHANGE_RATES.USD_TO_IQD.toLocaleString()} IQD
                  </div>
                  {formData.usd_amount && (
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      ${formData.usd_amount} ≈ {(parseFloat(formData.usd_amount || 0) * EXCHANGE_RATES.USD_TO_IQD).toLocaleString()} IQD
                    </div>
                  )}
                  {formData.iqd_amount && (
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      {parseFloat(formData.iqd_amount || 0).toLocaleString()} IQD ≈ ${(parseFloat(formData.iqd_amount || 0) * EXCHANGE_RATES.IQD_TO_USD).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              
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
                  setFormData({ person_name: '', usd_amount: '', iqd_amount: '', description: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleAddLoan}
                disabled={loading || !formData.person_name.trim() || ((parseFloat(formData.usd_amount) || 0) <= 0 && (parseFloat(formData.iqd_amount) || 0) <= 0)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? (t?.adding || 'Adding...') : (t?.addLoan || 'Add Loan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal - Multi-Currency Payment Support */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                💰 {t?.recordLoanPayment || 'Record Loan Payment'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t?.markingLoanPaidFor || 'Recording payment for'} <strong>{selectedLoan.person_name}</strong>
              </p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t?.originalLoan || 'Original Loan'}:
                </div>
                <div className="flex gap-2 mt-1">
                  {(selectedLoan.usd_amount || 0) > 0 && (
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(selectedLoan.usd_amount, 'USD')}
                    </span>
                  )}
                  {(selectedLoan.iqd_amount || 0) > 0 && (
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(selectedLoan.iqd_amount, 'IQD')}
                    </span>
                  )}
                </div>
                
                {/* Show remaining amounts */}
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {t?.remainingAmount || 'Remaining Amount'}:
                </div>
                <div className="flex gap-2 mt-1">
                  {(() => {
                    const remainingUSD = (selectedLoan.usd_amount || 0) - (selectedLoan.payment_usd_amount || 0);
                    const remainingIQD = (selectedLoan.iqd_amount || 0) - (selectedLoan.payment_iqd_amount || 0);
                    return (
                      <>
                        {remainingUSD > 0 && (
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(remainingUSD, 'USD')}
                          </span>
                        )}
                        {remainingIQD > 0 && (
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(remainingIQD, 'IQD')}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t?.enterPaymentAmounts || 'Enter payment amounts:'}
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      💵 USD Payment
                      {(() => {
                        const remainingUSD = (selectedLoan.usd_amount || 0) - (selectedLoan.payment_usd_amount || 0);
                        return remainingUSD > 0 ? (
                          <span className="text-red-500 ml-1">(Max: {formatCurrency(remainingUSD, 'USD')})</span>
                        ) : null;
                      })()}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={(selectedLoan.usd_amount || 0) - (selectedLoan.payment_usd_amount || 0)}
                      step="0.01"
                      value={paymentAmountUSD}
                      onChange={(e) => setPaymentAmountUSD(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      💰 IQD Payment
                      {(() => {
                        const remainingIQD = (selectedLoan.iqd_amount || 0) - (selectedLoan.payment_iqd_amount || 0);
                        return remainingIQD > 0 ? (
                          <span className="text-red-500 ml-1">(Max: {formatCurrency(remainingIQD, 'IQD')})</span>
                        ) : null;
                      })()}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={(selectedLoan.iqd_amount || 0) - (selectedLoan.payment_iqd_amount || 0)}
                      step="1"
                      value={paymentAmountIQD}
                      onChange={(e) => setPaymentAmountIQD(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Current Balance Display */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="text-sm text-green-800 dark:text-green-200 mb-2">
                  💳 {t?.currentBalance || 'Current Balance'}:
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700 dark:text-green-300">
                    USD: {formatCurrency(balances.usd_balance, 'USD')}
                  </span>
                  <span className="text-green-700 dark:text-green-300">
                    IQD: {formatCurrency(balances.iqd_balance, 'IQD')}
                  </span>
                </div>
              </div>

              {/* Payment Preview */}
              {(paymentAmountUSD || paymentAmountIQD) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    📝 {t?.paymentSummary || 'Payment Summary'}:
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {paymentAmountUSD && `+${formatCurrency(parseFloat(paymentAmountUSD), 'USD')}`}
                    {paymentAmountUSD && paymentAmountIQD && ' + '}
                    {paymentAmountIQD && `+${formatCurrency(parseFloat(paymentAmountIQD), 'IQD')}`}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {t?.willBeAddedToBalance || 'Will be added to your balance'}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedLoan(null);
                  setPaymentAmountUSD('');
                  setPaymentAmountIQD('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t?.cancel || 'Cancel'}
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment.has(selectedLoan.id) || (!paymentAmountUSD && !paymentAmountIQD)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                💰 {t?.recordPayment || 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
