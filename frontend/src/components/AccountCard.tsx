// frontend/src/components/AccountCard.tsx
import React from 'react';
import { AccountType } from '../App';

interface Account {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  currency: string;
  description?: string;
  creditFields?: {
    creditLimit?: number;
    availableCredit?: number;
    interestRate?: number;
    daysUntilPayment?: number;
  };
}

interface AccountCardProps {
  account: Account;
  onCreditCardClick?: (id: string) => void;
  onClick?: (account: Account) => void;
  onTransactionClick?: (account: Account) => void;
}

// AccountCard Component - Like a reusable class in C++
const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onCreditCardClick,
  onClick,
  onTransactionClick
}) => {
  const isCreditCard = account.type === 'credit_card';
  const isClickable = true;
  const hasDescription = account.description && account.description.trim() !== '';
  const bshouldShowDescription = hasDescription && account.type === AccountType.SAVINGS;

  const handleClick = () => {

    if (isCreditCard && onCreditCardClick) {
      onCreditCardClick(account._id);
    } 
    else if (onClick) {
      onClick(account);
    }
    else if (onTransactionClick) {
      onTransactionClick(account);
    }
  };

  const getAccountTypeIcon = (type: string) => {
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

  const getAccountTypeName = (type: string) => {
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

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        background: 'white',
        marginBottom: '1rem',
        cursor: isClickable ? 'pointer' : 'default',

      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>
            {getAccountTypeIcon(account.type)}
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
              {account.name}
            </h4>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              {getAccountTypeName(account.type)}
              {isCreditCard && ' - Click para detalles'}
              {!isCreditCard && ' - Haz clic para ver transacciones'}
            </p>
            {/* Credit Card Additional Info */}
            {isCreditCard && account.creditFields && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
                  <span>Límite: ${account.creditFields.creditLimit?.toLocaleString('es-MX')}</span>
                  <span>Disponible: ${account.creditFields.availableCredit?.toLocaleString('es-MX')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{
            margin: 0,
            fontSize: '1.3rem',
            fontWeight: 'bold',
            color: account.currentBalance >= 0 ? '#4caf50' : '#f44336'
          }}>
            ${account.currentBalance.toLocaleString('es-MX')}
          </p>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            {account.currency}
          </p>
          {/* Warning for high utilization */}
          {isCreditCard && account.creditFields && account.creditFields.creditLimit && (
            (() => {
              const utilization = (Math.abs(Math.min(0, account.currentBalance)) / account.creditFields.creditLimit!) * 100;
              if (utilization > 70) {
                return (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: '#ffebee',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#c62828',
                    fontWeight: 'bold'
                  }}>
                    ⚠️ Alta utilización ({utilization.toFixed(0)}%)
                  </div>
                );
              }
              return null;
            })()
          )}
        </div>
      </div>
      {/* Description at the bottom */}
      {bshouldShowDescription && (
        <div style={{
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: '#666',
          maxHeight: '60px',
          overflowY: 'auto',
          borderTop: '1px solid #eee',
          paddingTop: '0.5rem'
        }}>
          {account.description}
        </div>
      )}
    </div>
  );
};

export default AccountCard;