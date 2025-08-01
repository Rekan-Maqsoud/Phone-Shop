import React, { useState, useEffect } from 'react';
import { Icon } from '../utils/icons.jsx';
import { formatCurrency } from '../utils/exchangeRates';

const PaymentHistory = ({ debtId, debtType, t, isVisible = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && debtId && debtType) {
      fetchPaymentHistory();
    }
  }, [isVisible, debtId, debtType]);

  const fetchPaymentHistory = async () => {
    if (!window.api?.getTransactionsByReference) {
      console.error('getTransactionsByReference API not available');
      return;
    }

    setLoading(true);
    try {
      // Map debt types to transaction reference types
      const referenceTypeMap = {
        'personal': 'personal_loan',
        'customer': 'customer_debt', 
        'company': 'company_debt'
      };
      
      const referenceType = referenceTypeMap[debtType];
      if (!referenceType) {
        console.error('Invalid debt type:', debtType);
        return;
      }

      const transactions = await window.api.getTransactionsByReference(referenceType, debtId);
      
      // Filter for payment transactions only
      const paymentTransactions = transactions.filter(t => 
        t.type.includes('payment') || t.type.includes('_payment')
      );
      
      setPayments(paymentTransactions);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date nicely
  const formatPaymentDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString()}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString()}`;
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
  };

  // Calculate total payments
  const totalPaidUSD = payments.reduce((sum, p) => sum + (p.amount_usd || 0), 0);
  const totalPaidIQD = payments.reduce((sum, p) => sum + (p.amount_iqd || 0), 0);

  if (!isVisible) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-md">
          <Icon name="history" size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
          {t?.paymentHistory || 'Payment History'}
        </h4>
        {payments.length > 0 && (
          <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
            {payments.length} {payments.length === 1 ? (t?.payment || 'payment') : (t?.payments || 'payments')}
          </span>
        )}
        <button
          onClick={fetchPaymentHistory}
          className="ml-auto p-1.5 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-md transition-colors"
          title={t?.refresh || 'Refresh'}
        >
          <Icon name="refresh" size={14} className="text-blue-500 dark:text-blue-400" />
        </button>
      </div>
      
      {/* Total Summary */}
      {payments.length > 0 && (totalPaidUSD > 0 || totalPaidIQD > 0) && (
        <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t?.totalPaid || 'Total Paid'}:
          </div>
          <div className="flex flex-wrap gap-2">
            {totalPaidUSD > 0 && (
              <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold rounded">
                {formatCurrency(totalPaidUSD, 'USD')}
              </div>
            )}
            {totalPaidIQD > 0 && (
              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded">
                {formatCurrency(totalPaidIQD, 'IQD')}
              </div>
            )}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
          <span className="text-gray-500 text-sm">{t?.loading || 'Loading...'}</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-6">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-3">
            <Icon name="info" size={20} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">{t?.noPaymentHistory || 'No payment history found'}</p>
          <p className="text-gray-400 text-xs mt-1">{t?.paymentsWillAppearHere || 'Payment transactions will appear here'}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {payments.map((payment, index) => (
            <div key={payment.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {formatPaymentDate(payment.created_at)}
                  </div>
                  {index === 0 && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded font-medium">
                      {t?.latest || 'Latest'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {payment.description?.includes('(PARTIAL)') ? (
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={12} className="text-orange-500" />
                      {payment.description || t?.payment || 'Payment'}
                    </span>
                  ) : payment.description?.includes('(FINAL)') ? (
                    <span className="flex items-center gap-1">
                      <Icon name="check" size={12} className="text-green-500" />
                      {payment.description || t?.payment || 'Payment'}
                    </span>
                  ) : (
                    payment.description || t?.payment || 'Payment'
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex flex-col gap-1">
                  {payment.amount_usd > 0 && (
                    <div className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-semibold rounded border border-orange-200 dark:border-orange-700">
                      {formatCurrency(payment.amount_usd, 'USD')}
                    </div>
                  )}
                  {payment.amount_iqd > 0 && (
                    <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded border border-blue-200 dark:border-blue-700">
                      {formatCurrency(payment.amount_iqd, 'IQD')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
