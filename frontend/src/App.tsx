// frontend/src/App.tsx - Refactored with clean components
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

// Import our clean components
import AccountCard from './components/AccountCard';
import CreditCardInfoComponent from './components/CreditCardInfo';
import SummaryCard from './components/SummaryCard';
import Modal from './components/Modal';
import QuickActions from './components/QuickActions';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import AddAccountModal from './components/AddAccountModal';

export enum AccountType {
  CHECKING = 'checking',    // Checking account
  SAVINGS = 'savings',      // Savings account
  CREDIT_CARD = 'credit_card',     // Credit card
  AUTO_LOAN = 'auto_loan',         // Auto loan
  PERSONAL_LOAN = 'personal_loan', // Personal loan
  MORTGAGE = 'mortgage',           // Mortgage
  CASH = 'cash',                   // Cash
  INVESTMENT = 'investment'        // Investments
}

// Types (keep these the same)
interface User {
  id: string;
  email: string;
  name: string;
}

interface Account {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  currency: string;
  creditFields?: {
    creditLimit?: number;
    availableCredit?: number;
    interestRate?: number;
    daysUntilPayment?: number;
  };
}

// Login Component (unchanged - keep as is)
const Login: React.FC<{ onLogin: (token: string, user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isRegistering ? 
        'http://localhost:3001/api/auth/register' : 
        'http://localhost:3001/api/auth/login';
      
      const body = isRegistering ? 
        { name, email, password } : 
        { email, password };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.data.token, data.data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
        <h1 style={{color:'#c62828'}}>💰 Finanzas Personales</h1>
        <h2 style={{ color:'#c62828' }}>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
        
        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegistering}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color:'#333' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Cargando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <button 
          type="button" 
          className="btn-secondary btn" 
          onClick={() => setIsRegistering(!isRegistering)}
          style={{ width: '100%' }}
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
};

// Header Component (extracted for cleanliness)
const Header: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <header style={{ background: 'white', padding: '1rem 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
    <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ margin: 0, color:"#c62828" }}>💰 Finanzas Personales</h1>
      <div>
        <span style={{ marginRight: '1rem',  color:"#c62828" }}>Hola, {user.name}</span>
        <button className="btn-secondary btn" onClick={onLogout}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  </header>
);

// Dashboard Component (heavily refactored but same functionality)
const Dashboard: React.FC<{ user: User; token: string; onLogout: () => void }> = ({ user, token, onLogout }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedCreditCard, setSelectedCreditCard] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:3001/api/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error fetching accounts');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary data (like processing data in C++)
  const summaryData = React.useMemo(() => {
    //const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);

    let totalBalance = 0;
    accounts.forEach(account => {
      if (account.type !== AccountType.CREDIT_CARD && 
          account.type !== AccountType.SAVINGS
      )
      {
        totalBalance += account.currentBalance;
      }
    });

    const creditCards = accounts.filter(acc => acc.type === 'credit_card');
    const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(Math.min(0, card.currentBalance)), 0);
    
    return {
      totalBalance,
      totalAccounts: accounts.length,
      totalDebt,
      creditCards: creditCards.length
    };
  }, [accounts]);

  // Quick actions configuration (like function pointer array in C++)
  const quickActions = [
    {
      label: 'Agregar Gasto',
      icon: '📝',
      onClick: () => console.log('Add expense'), // TODO: Implement
      color: '#f44336'
    },
    {
      label: 'Agregar Ingreso', 
      icon: '💰',
      onClick: () => console.log('Add income'), // TODO: Implement
      color: '#4caf50'
    },
    {
      label: 'Transferencia',
      icon: '🔄', 
      onClick: () => console.log('Transfer'), // TODO: Implement
      color: '#2196f3'
    },
    {
      label: 'Ver Reportes',
      icon: '📊',
      onClick: () => console.log('Reports'), // TODO: Implement  
      color: '#9c27b0'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <Header user={user} onLogout={onLogout} />

      {/* Modals */}
      <Modal 
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="➕ Agregar Nueva Cuenta"
        maxWidth="700px"
      >
        <AddAccountModal
          token={token}
          onClose={() => setShowAddAccount(false)}
          onAccountAdded={() => {
            fetchAccounts();
            setShowAddAccount(false);
          }}
        />
      </Modal>

      {/* Credit Card Info Modal */}
      {selectedCreditCard && (
        <CreditCardInfoComponent
          accountId={selectedCreditCard}
          token={token}
          onClose={() => setSelectedCreditCard(null)}
        />
      )}

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '2rem' }}>
        {/* Summary Cards - Now using reusable component */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <SummaryCard
            title="Balance Total"
            value={`$${summaryData.totalBalance.toLocaleString('es-MX')}`}
            color={summaryData.totalBalance >= 0 ? '#4caf50' : '#f44336'}
            icon="💰"
          />
          
          <SummaryCard
            title="Cuentas Activas"
            value={summaryData.totalAccounts}
            color="#c62828"
            icon="🏦"
          />
          
          <SummaryCard
            title="Tarjetas de Crédito"
            value={summaryData.creditCards}
            color="#2196f3"
            icon="💳"
            subtitle={summaryData.totalDebt > 0 ? `Deuda: $${summaryData.totalDebt.toLocaleString('es-MX')}` : 'Sin deuda'}
          />
          
          <SummaryCard
            title="Este Mes"
            value="Próximamente"
            color="#666"
            icon="📅"
          />
        </div>

        {/* Accounts List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color:"#c62828" }}>Mis Cuentas</h2>
            <button className="btn" onClick={() => setShowAddAccount(true)}>
              + Agregar Cuenta
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Cargando cuentas..." />
          ) : error ? (
            <ErrorMessage 
              message={error} 
              onRetry={fetchAccounts}
              title="Error al cargar cuentas"
            />
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏦</div>
              <h3 style={{ margin: '0 0 1rem 0' }}>No tienes cuentas registradas</h3>
              <p style={{ marginBottom: '2rem' }}>Comienza creando tu primera cuenta para manejar tus finanzas</p>
              <button className="btn" onClick={() => setShowAddAccount(true)}>
                Crear tu primera cuenta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {accounts.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  onCreditCardClick={setSelectedCreditCard}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Now using reusable component */}
        <QuickActions actions={quickActions} />
      </main>
    </div>
  );
};

// Main App Component (unchanged)
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <Router>
      <div className="App">
        {!user || !token ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Dashboard user={user} token={token} onLogout={handleLogout} />
        )}
      </div>
    </Router>
  );
};

export default App;