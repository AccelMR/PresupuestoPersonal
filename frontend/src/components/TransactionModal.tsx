// frontend/src/components/TransactionModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

import { getURL } from '../config/api'

// Types - Like struct definitions in C++
interface Account {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  currency: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  color: string;
  icon?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: () => void;
  token: string;
  preselectedAccountId?: string; // For when opened from specific account
}

// Transaction types enum - Like C++ enum class
enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  ADJUSTMENT = 'adjustment'
}

enum PaymentMethod {
  CASH = 'cash',
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

// Helper functions - Like utility functions in C++
const getAccountTypeIcon = (type: string): string => {
  const iconMap: { [key: string]: string } = {
    'checking': '🏦',
    'savings': '💰',
    'credit_card': '💳',
    'cash': '💵',
    'investment': '📈',
    'auto_loan': '🚗',
    'personal_loan': '💼',
    'mortgage': '🏠'
  };
  return iconMap[type] || '💼';
};

const getPaymentMethodName = (method: string): string => {
  const nameMap: { [key: string]: string } = {
    'cash': 'Efectivo',
    'debit_card': 'Tarjeta de Débito',
    'credit_card': 'Tarjeta de Crédito',
    'bank_transfer': 'Transferencia Bancaria',
    'other': 'Otro'
  };
  return nameMap[method] || method;
};

// Main Component - Like a class in C++
const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  token,
  preselectedAccountId
}) => {
  // State variables - Like member variables in C++
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [accountId, setAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  
  // Recurring fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setInterval] = useState(1);
  const [endDate, setEndDate] = useState('');
  
  // Credit card fields
  const [installments, setInstallments] = useState('');
  const [interestRate, setInterestRate] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState('');

  // Effect hook - Like constructor initialization
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchCategories();
      resetForm();
      
      // Set preselected account if provided
      if (preselectedAccountId) {
        setAccountId(preselectedAccountId);
      }
    }
  }, [isOpen, preselectedAccountId]);

  // Fetch data functions - Like private methods in C++
  const fetchAccounts = async () => {
    try {
      setFetchingData(true);
      const response = await fetch( getURL.accounts(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      } else {
        setError('Error fetching accounts: ' + data.message);
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching accounts:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch( getURL.categories(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Reset form - Like destructor cleanup in C++
  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType(TransactionType.EXPENSE);
    setPaymentMethod(PaymentMethod.CASH);
    setAccountId(preselectedAccountId || '');
    setTransferToAccountId('');
    setCategoryId('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setMerchant('');
    setLocation('');
    setNotes('');
    setTags('');
    setIsRecurring(false);
    setFrequency('monthly');
    setInterval(1);
    setEndDate('');
    setInstallments('');
    setInterestRate('');
    setError('');
  };

  // Form validation - Like parameter checking in C++
  const validateForm = (): string | null => {
    if (!description.trim()) return 'Description is required';
    if (!amount || parseFloat(amount) === 0) return 'Amount is required and cannot be zero';
    if (!accountId) return 'Please select an account';
    if (type === TransactionType.TRANSFER && !transferToAccountId) return 'Transfer target account is required';
    if (type === TransactionType.TRANSFER && accountId === transferToAccountId) return 'Cannot transfer to the same account';
    
    return null;
  };

  // Handle form submission - Like main operation method in C++
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build transaction data - Like constructing an object in C++
      const transactionData: any = {
        description: description.trim(),
        amount: parseFloat(amount) * (type === TransactionType.EXPENSE ? -1 : 1), // Convert to negative for expenses
        type,
        paymentMethod,
        accountId,
        transactionDate,
        categoryId: categoryId || undefined,
        merchant: merchant.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined
      };

      // Add transfer-specific fields
      if (type === TransactionType.TRANSFER) {
        transactionData.transferToAccountId = transferToAccountId;
      }

      // Add recurring configuration
      if (isRecurring) {
        transactionData.isRecurring = true;
        transactionData.recurringConfig = {
          frequency,
          interval: parseInt(interval.toString()),
          endDate: endDate || undefined
        };
      }

      // Add credit card info if applicable
      if (paymentMethod === PaymentMethod.CREDIT_CARD && (installments || interestRate)) {
        transactionData.creditCardInfo = {
          installments: installments ? parseInt(installments) : undefined,
          interestRate: interestRate ? parseFloat(interestRate) : undefined
        };
      }

      console.log('🚀 Sending transaction data:', transactionData);

      const response = await fetch( getURL.transactions(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });

      const data = await response.json();

      if (data.success) {
        onTransactionCreated();
        onClose();
        resetForm();
      } else {
        setError(data.message || 'Error creating transaction');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Transaction creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered categories based on transaction type
  const getFilteredCategories = () => {
    return categories.filter(cat => 
      cat.type === type || cat.type === 'both'
    );
  };

  // Get filtered accounts for transfer target
  const getTransferTargetAccounts = () => {
    return accounts.filter(acc => acc._id !== accountId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💰 Add Transaction"
      maxWidth="800px"
      maxHeight="85vh"
    >
      <div style={{ color: '#111' }}>
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={error.includes('fetching') ? fetchAccounts : undefined}
          />
        )}

        {fetchingData ? (
          <LoadingSpinner message="Loading accounts and categories..." />
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Basic Transaction Info */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#1976d2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📝 Transaction Details
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Description: *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Grocery shopping at Soriana"
                    required
                    maxLength={500}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Amount: *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    min="0"
                    style={{ 
                      width: '6 0%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                  <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                    Enter positive amount (sign will be handled automatically)
                  </small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Type: *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value={TransactionType.EXPENSE}>💸 Expense</option>
                    <option value={TransactionType.INCOME}>💰 Income</option>
                    <option value={TransactionType.TRANSFER}>🔄 Transfer</option>
                    <option value={TransactionType.PAYMENT}>💳 Payment</option>
                    <option value={TransactionType.ADJUSTMENT}>⚖️ Adjustment</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Payment Method: *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    {Object.values(PaymentMethod).map((method) => (
                      <option key={method} value={method}>
                        {getPaymentMethodName(method)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Date: *
                  </label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Account Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#1976d2', marginBottom: '1rem' }}>
                🏦 Account Selection
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: type === TransactionType.TRANSFER ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    {type === TransactionType.TRANSFER ? 'From Account:' : 'Account:'} *
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {getAccountTypeIcon(account.type)} {account.name} (${account.currentBalance.toLocaleString('es-MX')})
                      </option>
                    ))}
                  </select>
                </div>

                {type === TransactionType.TRANSFER && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      To Account: *
                    </label>
                    <select
                      value={transferToAccountId}
                      onChange={(e) => setTransferToAccountId(e.target.value)}
                      required={type === TransactionType.TRANSFER}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '2px solid #ddd', 
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Select target account...</option>
                      {getTransferTargetAccounts().map((account) => (
                        <option key={account._id} value={account._id}>
                          {getAccountTypeIcon(account.type)} {account.name} (${account.currentBalance.toLocaleString('es-MX')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Category Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#1976d2', marginBottom: '1rem' }}>
                🏷️ Category & Details
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Category:
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">No category</option>
                    {getFilteredCategories().map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Merchant/Store:
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g., OXXO, Liverpool, etc."
                    maxLength={200}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Location:
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Guadalajara, JAL"
                    maxLength={200}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                    Tags (comma separated):
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., food, restaurant, work"
                    style={{ 
                      width: '80%', 
                      padding: '0.75rem', 
                      border: '2px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                  Notes:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or comments..."
                  rows={3}
                  maxLength={1000}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '2px solid #ddd', 
                    borderRadius: '8px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Credit Card Info */}
            {paymentMethod === PaymentMethod.CREDIT_CARD && (
              <div style={{ 
                border: '2px solid #e3f2fd', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                marginBottom: '2rem',
                backgroundColor: '#f8fffe'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💳 Credit Card Details
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Installments (MSI):
                    </label>
                    <input
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      placeholder="e.g., 3, 6, 12"
                      min="1"
                      max="48"
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Interest Rate (%):
                    </label>
                    <input
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="e.g., 24.99"
                      step="0.01"
                      min="0"
                      max="100"
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Transaction */}
            <div style={{ 
              border: '2px solid #fff3e0', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '2rem',
              backgroundColor: '#fffef7'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="isRecurring" style={{ fontWeight: 'bold', color: '#111', cursor: 'pointer' }}>
                  🔄 Make this a recurring transaction
                </label>
              </div>

              {isRecurring && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Frequency:
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Every X periods:
                    </label>
                    <input
                      type="number"
                      value={interval}
                      onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                      min="1"
                      max="12"
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      End Date (optional):
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={transactionDate}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                className="btn"
                disabled={loading}
                style={{ 
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Creating...' : '✅ Create Transaction'}
              </button>
              
              <button
                type="button"
                className="btn-secondary btn"
                onClick={onClose}
                disabled={loading}
                style={{ 
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default TransactionModal;