// frontend/src/components/AddAccountModal.tsx
import React, { useState } from 'react';

interface AddAccountModalProps {
  token: string;
  onClose: () => void;
  onAccountAdded: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ token, onClose, onAccountAdded }) => {
  // Basic fields
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [description, setDescription] = useState('');
  
  // Credit card specific fields
  const [creditLimit, setCreditLimit] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [cutoffDay, setCutoffDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accountTypes = [
    { value: 'checking', label: '🏦 Cuenta de Cheques', requiresCredit: false },
    { value: 'savings', label: '💰 Cuenta de Ahorros', requiresCredit: false },
    { value: 'credit_card', label: '💳 Tarjeta de Crédito', requiresCredit: true },
    { value: 'cash', label: '💵 Efectivo', requiresCredit: false },
    { value: 'investment', label: '📈 Inversiones', requiresCredit: false },
    { value: 'auto_loan', label: '🚗 Préstamo Automotriz', requiresCredit: true },
    { value: 'personal_loan', label: '💼 Préstamo Personal', requiresCredit: true },
    { value: 'mortgage', label: '🏠 Hipoteca', requiresCredit: true }
  ];

  // Check if current type requires credit fields
  const selectedAccountType = accountTypes.find(at => at.value === type);
  const requiresCreditFields = selectedAccountType?.requiresCredit || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Build base account data
      const accountData: any = {
        name: name.trim(),
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        currency: 'MXN',
        description: description.trim() || undefined
      };

      // Add credit fields if needed
      if (requiresCreditFields) {
        const creditFields: any = {
          creditLimit: parseFloat(creditLimit) || 0,
          interestRate: parseFloat(interestRate) || 0,
          minimumPayment: parseFloat(minimumPayment) || 0,
          openingDate: new Date()
        };

        // Add credit card specific fields
        if (type === 'credit_card') {
          creditFields.cutoffDay = parseInt(cutoffDay) || 1;
          creditFields.paymentDueDay = parseInt(paymentDueDay) || 20;
          creditFields.availableCredit = (parseFloat(creditLimit) || 0) + (parseFloat(initialBalance) || 0);
        }

        // Clean up undefined values
        Object.keys(creditFields).forEach(key => {
          if (creditFields[key] === undefined || creditFields[key] === 0) {
            delete creditFields[key];
          }
        });

        // Only add creditFields if we have actual data
        if (Object.keys(creditFields).length > 1) { // More than just openingDate
          accountData.creditFields = creditFields;
        }
      }

      console.log('🚀 Sending account data:', accountData);

      const response = await fetch('http://localhost:3001/api/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
      });

      const data = await response.json();

      if (data.success) {
        onAccountAdded();
        // Reset form
        setName('');
        setType('checking');
        setInitialBalance('');
        setDescription('');
        setCreditLimit('');
        setInterestRate('');
        setCutoffDay('');
        setPaymentDueDay('');
        setMinimumPayment('');
      } else {
        setError(data.message || 'Error creating account');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Account creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset credit fields when account type changes
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (!accountTypes.find(at => at.value === newType)?.requiresCredit) {
      setCreditLimit('');
      setInterestRate('');
      setCutoffDay('');
      setPaymentDueDay('');
      setMinimumPayment('');
    } else {
      // Set default values for credit products
      if (newType === 'credit_card') {
        setCutoffDay('1');
        setPaymentDueDay('20');
      }
    }
  };

  return (
    <div style={{ width: '100%', color: '#111' }}>
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #ffcdd2'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ color: '#111' }}>
        {/* Basic Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', color: '#111' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
              Nombre de la Cuenta:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Bancomer Principal"
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
              Tipo de Cuenta:
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{ 
                width: '80%', 
                padding: '0.75rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {accountTypes.map((accountType) => (
                <option key={accountType.value} value={accountType.value} style={{ color: '#111' }}>
                  {accountType.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', color: '#111' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
            {type === 'credit_card' ? 'Balance Actual (negativo = deuda):' : 'Balance Inicial:'}
          </label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0.00"
            step="0.01"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '2px solid #ddd', 
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          <small style={{ color: '#111', display: 'block', marginTop: '0.5rem' }}>
            {type === 'credit_card' 
              ? 'Para tarjetas de crédito, usa valores negativos si tienes deuda (ej. -5000)' 
              : 'Ingresa el balance actual de la cuenta'
            }
          </small>
        </div>

        {/* Credit Card Specific Fields */}
        {requiresCreditFields && (
          <div style={{ 
            border: '2px solid #e3f2fd', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            marginBottom: '1.5rem',
            backgroundColor: '#f8fffe',
            color: '#111'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {type === 'credit_card' ? '💳 Detalles de Tarjeta de Crédito' : '💰 Detalles del Préstamo'}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', color: '#111' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                  {type === 'credit_card' ? 'Límite de Crédito:' : 'Monto Original:'}
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="50000"
                  step="0.01"
                  min="0"
                  required={requiresCreditFields}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div>
                <label 
                  style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: 'bold', 
                    color: '#111' 
                    }}>
                  Tasa de Interés Anual (%):
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="24.99"
                  step="0.01"
                  min="0"
                  max="100"
                  style={{ 
                    width: '30%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px'
                  }}
                />
              </div>

              {type === 'credit_card' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Día de Corte (1-31):
                    </label>
                    <input
                      type="number"
                      value={cutoffDay}
                      onChange={(e) => setCutoffDay(e.target.value)}
                      placeholder="1"
                      min="1"
                      max="31"
                      style={{ 
                        width: '20%',
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                      Día de Pago (1-31):
                    </label>
                    <input
                      type="number"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                      placeholder="20"
                      min="1"
                      max="31"
                      style={{ 
                        width: '20%', 
                        padding: '0.75rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ gridColumn: type === 'credit_card' ? 'span 2' : 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                  Pago Mínimo Mensual:
                </label>
                <input
                  type="number"
                  value={minimumPayment}
                  onChange={(e) => setMinimumPayment(e.target.value)}
                  placeholder="500"
                  step="0.01"
                  min="0"
                  style={{ 
                    width: '50%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>

            {type === 'credit_card' && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#e8f5e8', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#2e7d32'
              }}>
                <strong>💡 Consejos:</strong>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: '#111' }}>
                  <li>El día de corte es cuando se cierra tu estado de cuenta</li>
                  <li>El día de pago es la fecha límite para pagar sin intereses</li>
                  <li>Normalmente hay 20 días entre el corte y el pago</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '2rem', color: '#111' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
            Descripción (opcional):
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ej. Cuenta principal para gastos diarios"
            rows={3}
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
              color: '#111'
            }}
          >
            {loading ? '⏳ Creando...' : '✅ Crear Cuenta'}
          </button>
          <button
            type="button"
            className="btn-secondary btn"
            onClick={onClose}
            disabled={loading}
            style={{ 
              flex: 1,
              padding: '1rem',
              fontSize: '1.1rem',
              color: '#111'
            }}
          >
            ❌ Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAccountModal;