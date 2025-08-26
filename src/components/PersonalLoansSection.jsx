import React, { useState, useEffect, useMemo } from 'react';
import { EXCHANGE_RATES, formatCurrency } from '../utils/exchangeRates';
import UniversalPaymentModal from './UniversalPaymentModal';
import PaymentHistory from './PaymentHistory';
import { Icon } from '../utils/icons.jsx';
import { useData } from '../contexts/DataContext';

export default function PersonalLoansSection({ admin, t, showConfirm }) {
  const { refreshTransactions, refreshPersonalLoans } = useData(); // Add access to refresh functions
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
  const [expandedPaymentHistories, setExpandedPaymentHistories] = useState(new Set());
  const [showTotalPaymentModal, setShowTotalPaymentModal] = useState(false);
  const [selectedPersonForPayment, setSelectedPersonForPayment] = useState(null);
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
      admin.setToast?.(`${t.error || 'Error'}: Please enter person name and at least one amount`, 'error');
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
        
        admin.setToast?.(`${t.success || 'Success'}: Loan of ${amounts.join(' + ')} added to ${formData.person_name}`, 'success');
        setFormData({ person_name: '', usd_amount: '', iqd_amount: '', description: '' });
        setShowModal(false);
        fetchLoans();
        fetchBalances(); // Refresh balances after adding loan
        
        // CRITICAL: Refresh data so dashboard sees the new loan
        if (refreshTransactions) {
          await refreshTransactions();
        }
        if (refreshPersonalLoans) {
          await refreshPersonalLoans();
        }
      } else {
        admin.setToast?.(`${t.error || 'Error'}: ${t?.failedToAddLoan || 'Failed to add loan'}: ` + (result?.message || result?.error || t?.unknownError || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error adding loan:', error);
      admin.setToast?.(`${t.error || 'Error'}: ${t?.errorAddingLoan || 'Error adding loan'}`, 'error');
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
      admin.setToast?.(`${t.error || 'Error'}: Please enter at least one payment amount`, 'error');
      return;
    }

    // Calculate remaining amounts to validate against overpayment
    const remainingUSD = (selectedLoan.usd_amount || 0) - (selectedLoan.payment_usd_amount || 0);
    const remainingIQD = (selectedLoan.iqd_amount || 0) - (selectedLoan.payment_iqd_amount || 0);

    // Validate payment doesn't exceed remaining amounts
    if (usdPayment > remainingUSD) {
      admin.setToast?.(`${t.error || 'Error'}: ${t?.usd || 'USD'} payment of ${formatCurrency(usdPayment, 'USD')} exceeds remaining balance of ${formatCurrency(remainingUSD, 'USD')}`, 'error');
      return;
    }
    if (iqdPayment > remainingIQD) {
      admin.setToast?.(`${t.error || 'Error'}: ${t?.iqd || 'IQD'} payment of ${iqdPayment} ${t?.iqd || 'IQD'} exceeds remaining balance of ${remainingIQD} ${t?.iqd || 'IQD'}`, 'error');
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
        
        admin.setToast?.(`${t.success || 'Success'}: Loan payment of ${amounts.join(' + ')} received from ${selectedLoan.person_name}`, 'success');
        fetchLoans();
        fetchBalances(); // Refresh balances after payment
        
        // CRITICAL: Refresh data so dashboard sees the new payment 
        if (refreshTransactions) {
          await refreshTransactions();
        }
        if (refreshPersonalLoans) {
          await refreshPersonalLoans();
        }
        
        setShowPaymentModal(false);
        setSelectedLoan(null);
      } else {
        admin.setToast?.(`${t.error || 'Error'}: ${t?.failedToMarkLoanAsPaid || 'Failed to mark loan as paid'}: ` + (result?.message || result?.error || t?.unknownError || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error marking loan as paid:', error);
      admin.setToast?.(`${t.error || 'Error'}: Error marking loan as paid`, 'error');
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
        // Calculate remaining amounts after partial payments, accounting for opposite currency payments
        let remainingUSD = 0;
        let remainingIQD = 0;
        if ((loan.usd_amount || 0) > 0) {
          // USD loan: subtract USD payments and IQD payments converted to USD
          const paidUSD = loan.payment_usd_amount || 0;
          const paidIQD = loan.payment_iqd_amount || 0;
          remainingUSD = Math.max(0, (loan.usd_amount || 0) - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
        }
        if ((loan.iqd_amount || 0) > 0) {
          // IQD loan: subtract IQD payments and USD payments converted to IQD
          const paidUSD = loan.payment_usd_amount || 0;
          const paidIQD = loan.payment_iqd_amount || 0;
          remainingIQD = Math.max(0, (loan.iqd_amount || 0) - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
        }
        groups[personName].unpaidUSD += remainingUSD;
        groups[personName].unpaidIQD += remainingIQD;
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

  const totalUnpaidUSD = loans.filter(l => !l.paid_at).reduce((sum, l) => {
    if ((l.usd_amount || 0) > 0) {
      const paidUSD = l.payment_usd_amount || 0;
      const paidIQD = l.payment_iqd_amount || 0;
      return sum + Math.max(0, (l.usd_amount || 0) - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
    }
    return sum;
  }, 0);
  const totalUnpaidIQD = loans.filter(l => !l.paid_at).reduce((sum, l) => {
    if ((l.iqd_amount || 0) > 0) {
      const paidUSD = l.payment_usd_amount || 0;
      const paidIQD = l.payment_iqd_amount || 0;
      return sum + Math.max(0, (l.iqd_amount || 0) - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
    }
    return sum;
  }, 0);

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

  const togglePaymentHistory = (loanId) => {
    setExpandedPaymentHistories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  const openTotalPaymentModal = (personName, totalDebt, forceCurrency = null) => {
    // Create a debt object that looks like individual debt for UniversalPaymentModal
    const syntheticDebt = {
      person_name: personName,
      totalDebt: totalDebt,
      isTotal: true, // Flag to indicate this is a total payment
      forceCurrency: forceCurrency // Add this flag to indicate forced currency deduction
    };
    
    setSelectedPersonForPayment(syntheticDebt);
    setShowTotalPaymentModal(true);
  };

  const processPersonalLoanTotalPayment = async (paymentData) => {
    try {
      if (!selectedPersonForPayment) {
        throw new Error('No person selected for payment');
      }

      // Check if this is a forced currency payment
      const forceCurrency = selectedPersonForPayment?.forceCurrency;

      let result;
      let apiFunction = null;
      let paymentPayload = {
        payment_usd_amount: paymentData.payment_usd_amount || 0,
        payment_iqd_amount: paymentData.payment_iqd_amount || 0,
        payment_currency_used: paymentData.payment_currency_used
      };

      // Use appropriate API based on force currency setting
      if (forceCurrency === 'USD') {
        apiFunction = 'payPersonalLoanTotalSimplifiedForcedUSD';
        if (!window.api?.payPersonalLoanTotalSimplifiedForcedUSD) {
          throw new Error('USD forced payment API not available');
        }
        result = await window.api.payPersonalLoanTotalSimplifiedForcedUSD(
          selectedPersonForPayment.person_name,
          paymentPayload
        );
      } else if (forceCurrency === 'IQD') {
        apiFunction = 'payPersonalLoanTotalSimplifiedForcedIQD';
        if (!window.api?.payPersonalLoanTotalSimplifiedForcedIQD) {
          throw new Error('IQD forced payment API not available');
        }
        result = await window.api.payPersonalLoanTotalSimplifiedForcedIQD(
          selectedPersonForPayment.person_name,
          paymentPayload
        );
      } else {
        // Regular payment - no forced currency
        apiFunction = 'payPersonalLoanTotal';
        if (!window.api?.payPersonalLoanTotal) {
          throw new Error('Regular payment API not available');
        }
        paymentPayload.payment_currency_used = paymentData.payment_currency_used || 'USD';
        result = await window.api.payPersonalLoanTotal(
          selectedPersonForPayment.person_name,
          paymentPayload
        );
      }

      if (result?.success) {
        // Show detailed payment result
        let message = `Successfully received payment from ${selectedPersonForPayment.person_name}`;
        if (result.paidDebts && result.paidDebts.length > 0) {
          message += ` (${result.paidDebts.length} loan${result.paidDebts.length > 1 ? 's' : ''} affected)`;
        } else if (result.paidLoans && result.paidLoans.length > 0) {
          message += ` (${result.paidLoans.length} loan${result.paidLoans.length > 1 ? 's' : ''} affected)`;
        }
        
        if (forceCurrency) {
          message += ` (${forceCurrency} balance preference)`;
        }
        
        if (result.hasOverpayment) {
          message += ' - Overpayment detected';
        }
        
        admin.setToast?.(message, 'success');
        
        await fetchLoans();
        await fetchBalances();
        
        // Refresh data contexts
        if (refreshTransactions) {
          await refreshTransactions();
        }
        if (refreshPersonalLoans) {
          await refreshPersonalLoans();
        }
        
        setShowTotalPaymentModal(false);
        setSelectedPersonForPayment(null);
      } else {
        console.error('🔍 [DEBUG] Payment failed - result not successful:', result);
        throw new Error(result?.message || result?.error || 'Payment failed');
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error processing total payment:', error);
      console.error('🔍 [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        selectedPersonForPayment,
        forceCurrency: selectedPersonForPayment?.forceCurrency
      });
      
      // Check if it's a database schema error
      if (error.message && error.message.includes('no such column: payment_exchange_rate')) {
        try {
          admin.setToast?.('Updating database schema...', 'info');
          
          // Run database migration
          const migrationResult = await window.api?.migrateDatabaseSchema?.();
          if (migrationResult?.success) {
            admin.setToast?.('Database schema updated. Please try the payment again.', 'success');
          } else {
            admin.setToast?.('Failed to update database schema. Please restart the app.', 'error');
          }
        } catch (migrationError) {
          admin.setToast?.('Database schema update failed. Please restart the app.', 'error');
        }
      }
      
      throw error;
    }
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
            <Icon name="personalLoans" size={32} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t?.personalLoans || 'Personal Loans'}
            </h1>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <Icon name="plus" className="inline mr-2" size={16} />{t?.addLoan || 'Add Loan'}
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">

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
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-400" size={16} />
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
            {showPaidLoans ? <><Icon name="check" className="inline mr-1" size={16} />{(t?.paidLoans || 'Paid Loans')}</> : <><Icon name="dollar-sign" className="inline mr-1" size={16} />{(t?.activeLoans || 'Active Loans')}</>}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!showPaidLoans && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              <span className="text-green-100 text-sm">{t?.outstandingUSD || 'Outstanding USD'}</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalUnpaidUSD, 'USD')}</div>
            <div className="text-green-100 text-sm">{t?.totalLoaned || 'Total Loaned'}</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <Icon name="dollar-sign" size={24} className="text-white" />
              <span className="text-orange-100 text-sm">{t?.outstandingIQD || 'Outstanding IQD'}</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalUnpaidIQD, 'IQD')}</div>
            <div className="text-orange-100 text-sm">{t?.totalLoaned || 'Total Loaned'}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.5,1L2,6V8H21V6M16,10V17H19V19H5V17H8V10H10V17H14V10"/>
              </svg>
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
            <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
              <Icon name="personalLoans" size={48} className="text-purple-600 dark:text-purple-400" />
            </div>
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
                                <Icon name="check" className="inline mr-1" size={16} />{formatCurrency(group.paidUSD, 'USD')}
                              </div>
                            )}
                            {group.paidIQD > 0 && (
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                <Icon name="check" className="inline mr-1" size={16} />{formatCurrency(group.paidIQD, 'IQD')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div>
                              {group.unpaidUSD > 0 && (
                                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(group.unpaidUSD, 'USD')}
                                </div>
                              )}
                              {group.unpaidIQD > 0 && (
                                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(group.unpaidIQD, 'IQD')}
                                </div>
                              )}
                            </div>
                            
                            {/* Pay All Buttons */}
                            {(group.unpaidUSD > 0 || group.unpaidIQD > 0) && (
                              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openTotalPaymentModal(group.person_name, { usd: group.unpaidUSD, iqd: group.unpaidIQD })}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium"
                                  title={t?.payAllLoans || 'Pay All Loans'}
                                >
                                  <Icon name="dollar-sign" size={12} className="inline mr-1" />
                                  {t?.payAll || 'Pay All'}
                                </button>
                                
                                {/* Only show USD/IQD buttons if person has debts in BOTH currencies */}
                                {group.unpaidUSD > 0 && group.unpaidIQD > 0 && (
                                  <>
                                    <button
                                      onClick={() => openTotalPaymentModal(group.person_name, { usd: group.unpaidUSD, iqd: group.unpaidIQD }, 'USD')}
                                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
                                      title={t?.payAllUSD || 'Pay All USD (use USD balance)'}
                                    >
                                      <Icon name="dollar-sign" size={12} className="inline mr-1" />
                                      USD
                                    </button>
                                    
                                    <button
                                      onClick={() => openTotalPaymentModal(group.person_name, { usd: group.unpaidUSD, iqd: group.unpaidIQD }, 'IQD')}
                                      className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-xs font-medium"
                                      title={t?.payAllIQD || 'Pay All IQD (use IQD balance)'}
                                    >
                                      <Icon name="dollar-sign" size={12} className="inline mr-1" />
                                      IQD
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-2xl text-gray-400 transition-transform duration-200">
                        {expandedPersons.has(group.person_name) ? <Icon name="chevron-up" size={20} /> : <Icon name="chevron-down" size={20} />}
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
                                {(() => {
                                  // Calculate remaining amounts for display
                                      // Calculate remaining amounts for display, accounting for opposite currency payments
                                      let remainingUSD = 0;
                                      let remainingIQD = 0;
                                      if ((loan.usd_amount || 0) > 0) {
                                        const paidUSD = loan.payment_usd_amount || 0;
                                        const paidIQD = loan.payment_iqd_amount || 0;
                                        remainingUSD = loan.paid_at ? (loan.usd_amount || 0) : Math.max(0, (loan.usd_amount || 0) - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
                                      }
                                      if ((loan.iqd_amount || 0) > 0) {
                                        const paidUSD = loan.payment_usd_amount || 0;
                                        const paidIQD = loan.payment_iqd_amount || 0;
                                        remainingIQD = loan.paid_at ? (loan.iqd_amount || 0) : Math.max(0, (loan.iqd_amount || 0) - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
                                      }
                                      return (
                                        <>
                                          {remainingUSD > 0 && (
                                            <div className={`text-lg font-bold ${
                                              loan.paid_at ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                                            }`}>
                                              {formatCurrency(remainingUSD, 'USD')}
                                            </div>
                                          )}
                                          {remainingIQD > 0 && (
                                            <div className={`text-lg font-bold ${
                                              loan.paid_at ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                                            }`}>
                                              {formatCurrency(remainingIQD, 'IQD')}
                                            </div>
                                          )}
                                        </>
                                      );
                                })()}
                              </div>
                              
                              {/* Show original amounts and payment details for partial payments */}
                              {!loan.paid_at && (loan.payment_usd_amount > 0 || loan.payment_iqd_amount > 0) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t?.originalAmount || 'Original'}: 
                                  {(loan.usd_amount || 0) > 0 && ` ${formatCurrency(loan.usd_amount, 'USD')}`}
                                  {(loan.usd_amount || 0) > 0 && (loan.iqd_amount || 0) > 0 && ' + '}
                                  {(loan.iqd_amount || 0) > 0 && ` ${formatCurrency(loan.iqd_amount, 'IQD')}`}
                                  <span className="ml-2">
                                    | {t?.paid || 'Paid'}: 
                                    {loan.payment_usd_amount > 0 && ` ${formatCurrency(loan.payment_usd_amount, 'USD')}`}
                                    {loan.payment_usd_amount > 0 && loan.payment_iqd_amount > 0 && ' + '}
                                    {loan.payment_iqd_amount > 0 && ` ${formatCurrency(loan.payment_iqd_amount, 'IQD')}`}
                                  </span>
                                </div>
                              )}
                              
                              {loan.paid_at && (
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  <Icon name="check" className="inline mr-1" size={12} />{t?.paidOn || 'Paid on'} {new Date(loan.paid_at).toLocaleDateString()} {new Date(loan.paid_at).toLocaleTimeString()}
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
                                  <><Icon name="clock" className="inline mr-1" size={16} />{t?.processing || 'Processing...'}</>
                                ) : (
                                  <><Icon name="dollar-sign" className="inline mr-1" size={16} />{t?.markPaid || 'Mark Paid'}</>
                                )}
                              </button>
                            )}
                          </div>
                          
                          {/* Payment History Section */}
                          {(loan.payment_usd_amount > 0 || loan.payment_iqd_amount > 0 || loan.paid_at) && (
                            <div className="mt-3">
                              <button
                                onClick={() => togglePaymentHistory(loan.id)}
                                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                              >
                                <Icon name="history" size={14} />
                                {t?.paymentHistory || 'Payment History'}
                                <Icon 
                                  name={expandedPaymentHistories.has(loan.id) ? "chevron-up" : "chevron-down"} 
                                  size={14} 
                                />
                              </button>
                              <PaymentHistory
                                debtId={loan.id}
                                debtType="personal"
                                t={t}
                                isVisible={expandedPaymentHistories.has(loan.id)}
                              />
                            </div>
                          )}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                <Icon name="plus" className="inline mr-2" size={20} />{t?.addPersonalLoan || 'Add Personal Loan'}
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
                    <Icon name="dollar-sign" className="inline mr-1" size={16} />{t?.iqdAmount || 'IQD Amount'}
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
                    <Icon name="dollar-sign" size={16} className="mr-1" />
                    {t?.exchangeRateInfo || 'Exchange Rate Info'}:
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    1 USD = {EXCHANGE_RATES.USD_TO_IQD.toLocaleString()} IQD
                  </div>
                  {formData.usd_amount && (
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      {formatCurrency(parseFloat(formData.usd_amount || 0), 'USD')} ≈ {(parseFloat(formData.usd_amount || 0) * EXCHANGE_RATES.USD_TO_IQD).toLocaleString()} IQD
                    </div>
                  )}
                  {formData.iqd_amount && (
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      {parseFloat(formData.iqd_amount || 0).toLocaleString()} IQD ≈ {formatCurrency((parseFloat(formData.iqd_amount || 0) * EXCHANGE_RATES.IQD_TO_USD), 'USD')}
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

      {/* Universal Payment Modal */}
      <UniversalPaymentModal
        show={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedLoan(null);
          setPaymentAmountUSD('');
          setPaymentAmountIQD('');
        }}
        debtData={selectedLoan}
        paymentType="personal"
        onPaymentComplete={async () => {
          fetchLoans();
          fetchBalances();
          
          // CRITICAL: Refresh data so dashboard sees the payment
          if (refreshTransactions) {
            await refreshTransactions();
          }
          if (refreshPersonalLoans) {
            await refreshPersonalLoans();
          }
        }}
        admin={admin}
        t={t}
      />

      {/* Personal Loan Total Payment Modal */}
      <UniversalPaymentModal
        show={showTotalPaymentModal}
        onClose={() => {
          setShowTotalPaymentModal(false);
          setSelectedPersonForPayment(null);
        }}
        debtData={selectedPersonForPayment}
        paymentType="personal_total"
        forceCurrency={selectedPersonForPayment?.forceCurrency}
        onPaymentComplete={async (paymentData) => {
          try {
            await processPersonalLoanTotalPayment({
              ...paymentData,
              person_name: selectedPersonForPayment?.person_name
            });
          } catch (error) {
            console.error('Payment error:', error);
            throw error;
          }
        }}
        admin={admin}
        t={t}
      />
    </div>
  );
}
