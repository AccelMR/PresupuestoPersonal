// frontend/src/components/CreditCardPaymentCard.tsx
import React from 'react';

// Types - Like struct definitions in C++
interface CreditCard {
  _id: string;
  name: string;
  currentBalance: number;
  currency: string;
  creditFields: {
    creditLimit: number;
    availableCredit: number;
    minimumPayment: number;
    interestRate: number;
    cutoffDay: number;
    paymentDueDay: number;
    nextCutoffDate?: Date;
    nextPaymentDate?: Date;
    lastCutoffDate?: Date;
  };
}

interface CreditCardPaymentCardProps {
  creditCard: CreditCard;
  onClick?: (cardId: string) => void;
}

// Helper functions - Like utility functions in C++
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

const calculateDaysRemaining = (targetDate: Date): number => {
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const getPaymentUrgencyColor = (daysRemaining: number): string => {
  if (daysRemaining <= 3) return '#f44336'; // Red - Critical
  if (daysRemaining <= 7) return '#ff9800'; // Orange - Warning
  if (daysRemaining <= 14) return '#ffc107'; // Yellow - Attention
  return '#4caf50'; // Green - Safe
};

const getPaymentUrgencyMessage = (daysRemaining: number): string => {
  if (daysRemaining === 0) return 'Payment due TODAY!';
  if (daysRemaining === 1) return 'Payment due TOMORROW!';
  if (daysRemaining <= 3) return 'Payment due SOON!';
  if (daysRemaining <= 7) return 'Payment due this week';
  return 'Payment scheduled';
};

// Main Component - Like a class in C++
const CreditCardPaymentCard: React.FC<CreditCardPaymentCardProps> = ({ 
  creditCard, 
  onClick 
}) => {
  const { creditFields } = creditCard;
  
  // Calculate current debt - Like a computed property in C++
  const currentDebt = Math.abs(Math.min(0, creditCard.currentBalance));
  
  // Calculate utilization percentage
  const utilizationPercentage = Math.min(
    (currentDebt / creditFields.creditLimit) * 100, 
    100
  );
  
  // Parse dates - Like type conversion in C++
  const nextPaymentDate = creditFields.nextPaymentDate ? 
    new Date(creditFields.nextPaymentDate) : null;
  const nextCutoffDate = creditFields.nextCutoffDate ? 
    new Date(creditFields.nextCutoffDate) : null;
  
  // Calculate days remaining - Like method calls in C++
  const daysUntilPayment = nextPaymentDate ? 
    calculateDaysRemaining(nextPaymentDate) : null;
  const daysUntilCutoff = nextCutoffDate ? 
    calculateDaysRemaining(nextCutoffDate) : null;
  
  // Get urgency styling
  const urgencyColor = daysUntilPayment !== null ? 
    getPaymentUrgencyColor(daysUntilPayment) : '#666';
  const urgencyMessage = daysUntilPayment !== null ? 
    getPaymentUrgencyMessage(daysUntilPayment) : 'No payment info';

  const handleClick = () => {
    if (onClick) {
      onClick(creditCard._id);
    }
  };

  return (
    <div 
      style={{
        border: `2px solid ${urgencyColor}`,
        borderRadius: '12px',
        padding: '1.5rem',
        background: 'white',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: daysUntilPayment !== null && daysUntilPayment <= 7 ? 
          `0 4px 12px ${urgencyColor}40` : '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 6px 20px ${urgencyColor}60`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = daysUntilPayment !== null && daysUntilPayment <= 7 ? 
            `0 4px 12px ${urgencyColor}40` : '0 2px 8px rgba(0,0,0,0.1)';
        }
      }}
    >
      {/* Urgency indicator bar - Like a visual state indicator */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: urgencyColor,
          borderRadius: '12px 12px 0 0'
        }}
      />

      {/* Header section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 0.25rem 0', 
            color: '#333',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            💳 {creditCard.name}
          </h3>
          <div style={{ 
            fontSize: '0.8rem', 
            color: urgencyColor,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {urgencyMessage}
          </div>
        </div>
        
        {daysUntilPayment !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: '1.8rem', 
              fontWeight: 'bold',
              color: urgencyColor,
              lineHeight: 1
            }}>
              {daysUntilPayment}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#666',
              textTransform: 'uppercase',
              marginTop: '0.25rem'
            }}>
              {daysUntilPayment === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        )}
      </div>

      {/* Payment information grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
            Minimum Payment
          </div>
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold',
            color: urgencyColor
          }}>
            {formatCurrency(creditFields.minimumPayment)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
            Current Debt
          </div>
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold',
            color: currentDebt > 0 ? '#f44336' : '#4caf50'
          }}>
            {formatCurrency(currentDebt)}
          </div>
        </div>
      </div>

      {/* Due date information */}
      {nextPaymentDate && (
        <div style={{ 
          background: `${urgencyColor}15`,
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
            Payment Due Date
          </div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 'bold',
            color: urgencyColor
          }}>
            {nextPaymentDate.toLocaleDateString('es-MX', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      )}

      {/* Utilization bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            Utilization
          </span>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 'bold',
            color: utilizationPercentage > 70 ? '#f44336' : '#666'
          }}>
            {utilizationPercentage.toFixed(1)}%
          </span>
        </div>
        
        <div style={{ 
          width: '100%', 
          height: '6px', 
          background: '#e0e0e0', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(utilizationPercentage, 100)}%`,
            height: '100%',
            background: utilizationPercentage > 70 ? '#f44336' : 
                       utilizationPercentage > 30 ? '#ff9800' : '#4caf50',
            borderRadius: '3px',
            transition: 'width 0.8s ease'
          }} />
        </div>
      </div>

      {/* Cutoff information */}
      {nextCutoffDate && daysUntilCutoff !== null && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#666',
          textAlign: 'center',
          padding: '0.5rem',
          background: '#f8f9fa',
          borderRadius: '6px'
        }}>
          Next cutoff in {daysUntilCutoff} days ({nextCutoffDate.toLocaleDateString('es-MX')})
        </div>
      )}

      {/* Click hint */}
      {onClick && (
        <div style={{ 
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.75rem',
          fontSize: '0.7rem',
          color: '#999',
          fontStyle: 'italic'
        }}>
          Click for details
        </div>
      )}
    </div>
  );
};

export default CreditCardPaymentCard;