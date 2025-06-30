// frontend/src/components/CustomBalanceModal.tsx
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
  creditFields?: {
    creditLimit?: number;
    availableCredit?: number;
  };
}

interface CustomBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomBalanceCreated: () => void;
  token: string;
}

// Helper function - Like a utility function in C++
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

const getAccountTypeName = (type: string): string => {
  const nameMap: { [key: string]: string } = {
    'checking': 'Cuenta de Cheques',
    'savings': 'Cuenta de Ahorros', 
    'credit_card': 'Tarjeta de Crédito',
    'cash': 'Efectivo',
    'investment': 'Inversiones',
    'auto_loan': 'Préstamo Automotriz',
    'personal_loan': 'Préstamo Personal',
    'mortgage': 'Hipoteca'
  };
  return nameMap[type] || type.replace('_', ' ');
};

// Main Component - Like a class in C++
const CustomBalanceModal: React.FC<CustomBalanceModalProps> = ({
  isOpen,
  onClose,
  onCustomBalanceCreated,
  token
}) => {
  // State variables - Like member variables in C++
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [error, setError] = useState('');

  // Effect hook - Like initialization in constructor
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      // Reset form when modal opens
      setName('');
      setDescription('');
      setSelectedAccountIds([]);
      setError('');
    }
  }, [isOpen]);

  // Fetch accounts function - Like a private method in C++
  const fetchAccounts = async () => {
    try {
      setFetchingAccounts(true);
      setError('');
      
      const response = await fetch(getURL.accounts(), {
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
      setFetchingAccounts(false);
    }
  };

  // Handle checkbox change - Like an event handler in C++
  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        // Remove if already selected - like removing from vector in C++
        return prev.filter(id => id !== accountId);
      } else {
        // Add if not selected - like push_back in C++
        return [...prev, accountId];
      }
    });
  };

  // Select/Deselect all - Like bulk operations in C++
  const handleSelectAll = () => {
    if (selectedAccountIds.length === accounts.length) {
      setSelectedAccountIds([]); // Deselect all
    } else {
      setSelectedAccountIds(accounts.map(account => account._id)); // Select all
    }
  };

  // Calculate preview totals - Like a computed property in C++
  const calculatePreviewTotals = () => {
    const selectedAccounts = accounts.filter(account => 
      selectedAccountIds.includes(account._id)
    );

    const totalBalance = selectedAccounts.reduce((sum, account) => 
      sum + account.currentBalance, 0
    );

    const balanceByType: { [key: string]: number } = {};
    selectedAccounts.forEach(account => {
      const typeName = getAccountTypeName(account.type);
      if (!balanceByType[typeName]) {
        balanceByType[typeName] = 0;
      }
      balanceByType[typeName] += account.currentBalance;
    });

    return { totalBalance, balanceByType, accountCount: selectedAccounts.length };
  };

  // Form submission - Like a main operation method in C++
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - Like parameter checking in C++
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (selectedAccountIds.length === 0) {
      setError('Please select at least one account');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getURL.customBalances(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          accountIds: selectedAccountIds
        })
      });

      const data = await response.json();

      if (data.success) {
        onCustomBalanceCreated();
        onClose();
        // Reset form
        setName('');
        setDescription('');
        setSelectedAccountIds([]);
      } else {
        setError(data.message || 'Error creating custom balance');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error creating custom balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const previewTotals = calculatePreviewTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💼 Create Custom Balance"
      maxWidth="800px"
      maxHeight="80vh"
    >
      <div style={{ color: '#111' }}>
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={error.includes('fetching') ? fetchAccounts : undefined}
          />
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#1976d2', marginBottom: '1rem' }}>
              📝 Basic Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold', 
                  color: '#111' 
                }}>
                  Name: *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Main Accounts, Investment Portfolio"
                  required
                  maxLength={100}
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
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold', 
                  color: '#111' 
                }}>
                  Description (optional):
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this custom balance..."
                  rows={3}
                  maxLength={500}
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
          </div>

          {/* Account Selection Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h3 style={{ color: '#1976d2', margin: 0 }}>
                🏦 Select Accounts ({selectedAccountIds.length} of {accounts.length})
              </h3>
              
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: '2px solid #1976d2',
                    color: '#1976d2',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedAccountIds.length === accounts.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {fetchingAccounts ? (
              <LoadingSpinner message="Loading accounts..." />
            ) : accounts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                color: '#666',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
                <p>No accounts found. Create some accounts first.</p>
              </div>
            ) : (
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                {accounts.map((account) => (
                  <div
                    key={account._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #eee',
                      borderRadius: '6px',
                      background: selectedAccountIds.includes(account._id) ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleAccountToggle(account._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.includes(account._id)}
                      onChange={() => handleAccountToggle(account._id)}
                      style={{ 
                        marginRight: '1rem', 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    
                    <div style={{ fontSize: '1.5rem', marginRight: '1rem' }}>
                      {getAccountTypeIcon(account.type)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>
                        {account.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {getAccountTypeName(account.type)}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '1.1rem',
                        color: account.currentBalance >= 0 ? '#4caf50' : '#f44336'
                      }}>
                        ${account.currentBalance.toLocaleString('es-MX')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        {account.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Section - Only show if accounts selected */}
          {selectedAccountIds.length > 0 && (
            <div style={{ 
              marginBottom: '2rem',
              background: '#f8f9fa',
              border: '2px solid #28a745',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 style={{ color: '#28a745', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👁️ Preview
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Total Balance:</span>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: previewTotals.totalBalance >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    ${previewTotals.totalBalance.toLocaleString('es-MX')}
                  </div>
                </div>
                
                <div>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Selected Accounts:</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
                    {previewTotals.accountCount}
                  </div>
                </div>
              </div>

              {Object.keys(previewTotals.balanceByType).length > 0 && (
                <div>
                  <span style={{ color: '#666', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    Balance by Type:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(previewTotals.balanceByType).map(([type, balance]) => (
                      <div
                        key={type}
                        style={{
                          background: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: '1px solid #ddd',
                          fontSize: '0.9rem'
                        }}
                      >
                        <strong>{type}:</strong> ${balance.toLocaleString('es-MX')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading || selectedAccountIds.length === 0 || !name.trim()}
              style={{ 
                flex: 1,
                padding: '1rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                opacity: (loading || selectedAccountIds.length === 0 || !name.trim()) ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Creating...' : '✅ Create Custom Balance'}
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
      </div>
    </Modal>
  );
};

export default CustomBalanceModal;