// frontend/src/components/CreditCardInfo.tsx
import React, { useState, useEffect } from 'react';

interface CreditCardInfo {
  name: string;
  currentBalance: number;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  interestRate: number;
  daysUntilPayment: number | null;
}

interface PaymentScenario {
  amount: number;
  monthsToPayoff: number;
  totalInterest: number;
}

interface PaymentCalculation {
  accountInfo: CreditCardInfo;
  paymentScenarios: {
    minimumPayment: PaymentScenario;
    noInterestPayment: PaymentScenario;
    customPayoff: PaymentScenario;
  };
}

interface CreditCardInfoProps {
  accountId: string;
  token: string;
  onClose: () => void;
}

const CreditCardInfoComponent: React.FC<CreditCardInfoProps> = ({ accountId, token, onClose }) => {
  const [paymentData, setPaymentData] = useState<PaymentCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customMonths, setCustomMonths] = useState(12);

  useEffect(() => {
    fetchPaymentCalculation();
  }, [customMonths]);

  const fetchPaymentCalculation = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3001/api/accounts/${accountId}/payment-calculation?targetPayoffMonths=${customMonths}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setPaymentData(data.data);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error fetching payment calculation');
      console.error('Payment calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatMonths = (months: number) => {
    if (months === Infinity) return 'Nunca (la deuda crecerá)';
    if (months > 1200) return '100+ años';
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${months} meses`;
    if (remainingMonths === 0) return `${years} años`;
    return `${years} años, ${remainingMonths} meses`;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 30) return '#4caf50'; // Green - Good
    if (percentage < 70) return '#ff9800'; // Orange - Warning
    return '#f44336'; // Red - Danger
  };

  const getUtilizationMessage = (percentage: number) => {
    if (percentage < 10) return 'Excelente utilización';
    if (percentage < 30) return 'Buena utilización';
    if (percentage < 70) return 'Utilización moderada';
    if (percentage < 90) return 'Utilización alta';
    return 'Utilización crítica';
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="card">
          <p>Cargando cálculos de pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#f44336' }}>❌ Error</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
              ×
            </button>
          </div>
          <p style={{ color: '#f44336' }}>{error}</p>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="card">
          <p>No hay datos disponibles</p>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  const { accountInfo, paymentScenarios } = paymentData;
  const utilizationPercentage = Math.min((accountInfo.currentDebt / accountInfo.creditLimit) * 100, 100);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ 
        width: '900px', 
        maxWidth: '95%', 
        margin: 0,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#1976d2' }}>💳 {accountInfo.name}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Credit Card Overview */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
          color: 'white',
          borderRadius: '12px', 
          padding: '1.5rem', 
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card-like design */}
          <div style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '2rem', opacity: 0.3 }}>
            💳
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', opacity: 0.9, fontSize: '0.9rem' }}>BALANCE ACTUAL</h4>
              <p style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {formatCurrency(accountInfo.currentBalance)}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', opacity: 0.9, fontSize: '0.9rem' }}>CRÉDITO DISPONIBLE</h4>
              <p style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {formatCurrency(accountInfo.availableCredit)}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', opacity: 0.9, fontSize: '0.9rem' }}>LÍMITE DE CRÉDITO</h4>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(accountInfo.creditLimit)}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', opacity: 0.9, fontSize: '0.9rem' }}>TASA DE INTERÉS</h4>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                {accountInfo.interestRate}% Anual
              </p>
            </div>
          </div>
        </div>

        {/* Credit Utilization Section */}
        <div style={{ 
          background: '#f8f9fa', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#495057' }}>📊 Utilización de Crédito</h3>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: getUtilizationColor(utilizationPercentage) 
              }}>
                {utilizationPercentage.toFixed(1)}%
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: getUtilizationColor(utilizationPercentage),
                fontWeight: 'bold'
              }}>
                {getUtilizationMessage(utilizationPercentage)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ 
            width: '100%', 
            height: '24px', 
            background: '#e9ecef', 
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: `${Math.min(utilizationPercentage, 100)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${getUtilizationColor(utilizationPercentage)}, ${getUtilizationColor(utilizationPercentage)}dd)`,
              transition: 'width 0.8s ease',
              borderRadius: '12px',
              position: 'relative'
            }}>
              {utilizationPercentage > 10 && (
                <div style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {utilizationPercentage.toFixed(0)}%
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Deuda actual:</span>
              <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#dc3545' }}>
                {formatCurrency(accountInfo.currentDebt)}
              </p>
            </div>
            <div>
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Límite recomendado (30%):</span>
              <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#28a745' }}>
                {formatCurrency(accountInfo.creditLimit * 0.3)}
              </p>
            </div>
          </div>

          {accountInfo.daysUntilPayment !== null && (
            <div style={{ 
              marginTop: '1rem', 
              textAlign: 'center',
              padding: '1rem',
              background: accountInfo.daysUntilPayment <= 7 ? '#fff3cd' : '#d1edff',
              borderRadius: '8px',
              border: `2px solid ${accountInfo.daysUntilPayment <= 7 ? '#ffc107' : '#0dcaf0'}`
            }}>
              <p style={{ 
                margin: 0, 
                color: accountInfo.daysUntilPayment <= 7 ? '#856404' : '#055160',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}>
                ⏰ {accountInfo.daysUntilPayment} días hasta el vencimiento
                {accountInfo.daysUntilPayment <= 7 && ' ⚠️'}
              </p>
            </div>
          )}
        </div>

        {/* Payment Scenarios */}
        {accountInfo.currentDebt > 0 ? (
          <div>
            <h3 style={{ color: '#1976d2', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💡 Estrategias de Pago
            </h3>
            
            {/* Minimum Payment Scenario */}
            <div style={{ 
              border: '2px solid #dc3545', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '1.5rem',
              background: '#fff5f5'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                😰 Solo Pago Mínimo
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Pago mensual:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentScenarios.minimumPayment.amount)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Tiempo para saldar:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#dc3545' }}>
                    {formatMonths(paymentScenarios.minimumPayment.monthsToPayoff)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Intereses totales:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#dc3545', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentScenarios.minimumPayment.totalInterest)}
                  </p>
                </div>
              </div>
            </div>

            {/* No Interest Payment */}
            <div style={{ 
              border: '2px solid #28a745', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              marginBottom: '1.5rem',
              background: '#f8fff9'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#28a745', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✨ Pagar Sin Intereses
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Pago requerido:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', fontSize: '1.2rem', color: '#28a745' }}>
                    {formatCurrency(paymentScenarios.noInterestPayment.amount)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Pagar antes del:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0' }}>
                    Próximo vencimiento
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Ahorro en intereses:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#28a745', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentScenarios.minimumPayment.totalInterest)}
                  </p>
                </div>
              </div>
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: '#d4edda', 
                borderRadius: '6px',
                color: '#155724',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                💰 ¡Recomendación! Esta es la mejor opción para evitar intereses completamente.
              </div>
            </div>

            {/* Custom Payoff */}
            <div style={{ 
              border: '2px solid #007bff', 
              borderRadius: '12px', 
              padding: '1.5rem',
              background: '#f8f9ff'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#007bff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎯 Plan de Pago Personalizado
              </h4>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Período objetivo (meses):
                </label>
                <input
                  type="number"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(parseInt(e.target.value) || 12)}
                  min="1"
                  max="60"
                  style={{ 
                    width: '200px', 
                    padding: '0.75rem', 
                    border: '2px solid #007bff', 
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Pago mensual:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', fontSize: '1.2rem', color: '#007bff' }}>
                    {formatCurrency(paymentScenarios.customPayoff.amount)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Intereses totales:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0' }}>
                    {formatCurrency(paymentScenarios.customPayoff.totalInterest)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Ahorro vs mínimo:</span>
                  <p style={{ fontWeight: 'bold', margin: '0.25rem 0', color: '#28a745', fontSize: '1.1rem' }}>
                    {formatCurrency(
                      Math.max(0, paymentScenarios.minimumPayment.totalInterest - paymentScenarios.customPayoff.totalInterest)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No Debt Celebration */
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            background: 'linear-gradient(135deg, #28a745, #20c997)', 
            borderRadius: '12px',
            color: 'white'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '2rem' }}>¡Felicidades!</h3>
            <p style={{ margin: 0, fontSize: '1.2rem', opacity: 0.95 }}>
              No tienes deuda pendiente en esta tarjeta de crédito.
            </p>
            <p style={{ margin: '1rem 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
              Mantén este buen hábito financiero 💪
            </p>
          </div>
        )}

        {/* Close Button */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            className="btn" 
            onClick={onClose}
            style={{ 
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              minWidth: '150px'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditCardInfoComponent;