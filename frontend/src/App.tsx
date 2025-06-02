import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

// Types
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
}

// Components
const AddAccountModal: React.FC<{
  token: string;
  onClose: () => void;
  onAccountAdded: () => void;
}> = ({ token, onClose, onAccountAdded }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accountTypes = [
    { value: 'checking', label: '🏦 Cuenta de Cheques' },
    { value: 'savings', label: '💰 Cuenta de Ahorros' },
    { value: 'credit_card', label: '💳 Tarjeta de Crédito' },
    { value: 'cash', label: '💵 Efectivo' },
    { value: 'investment', label: '📈 Inversiones' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const accountData = {
        name,
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        currency: 'MXN',
        description: description || undefined
      };

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
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error creating account');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="card" style={{ width: '500px', maxWidth: '90%', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>➕ Agregar Nueva Cuenta</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Nombre de la Cuenta:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Bancomer Principal"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Tipo de Cuenta:
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {accountTypes.map((accountType) => (
                <option key={accountType.value} value={accountType.value}>
                  {accountType.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Balance Inicial:
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              step="0.01"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <small style={{ color: '#666' }}>
              Para tarjetas de crédito, usa valores negativos si tienes deuda
            </small>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Descripción (opcional):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ej. Cuenta principal para gastos"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
            <button
              type="button"
              className="btn-secondary btn"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
        <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
        
        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

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
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contraseña:</label>
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

const Dashboard: React.FC<{ user: User; token: string; onLogout: () => void }> = ({ user, token, onLogout }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
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

  const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
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

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          token={token}
          onClose={() => setShowAddAccount(false)}
          onAccountAdded={() => {
            fetchAccounts();
            setShowAddAccount(false);
          }}
        />
      )}

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '2rem' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Balance Total</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: totalBalance >= 0 ? '#4caf50' : '#f44336' }}>
              ${totalBalance.toLocaleString('es-MX')}
            </p>
          </div>
          
          <div className="card">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Cuentas Activas</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color:"#c62828" }}>
              {accounts.length}
            </p>
          </div>
          
          <div className="card">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Este Mes</h3>
            <p style={{ fontSize: '1.2rem', margin: 0, color: '#666' }}>
              Próximamente
            </p>
          </div>
        </div>

        {/* Accounts List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color:"#c62828" }}>Mis Cuentas</h2>
            <button className="btn" onClick={() => setShowAddAccount(true)}>+ Agregar Cuenta</button>
          </div>

          {loading ? (
            <p>Cargando cuentas...</p>
          ) : error ? (
            <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px' }}>
              {error}
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <p>No tienes cuentas registradas</p>
              <button className="btn" onClick={() => setShowAddAccount(true)}>Crear tu primera cuenta</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', color:"#c62828" }}>
              {accounts.map((account) => (
                <div key={account._id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{account.name}</h4>
                    <p style={{ margin: 0, color: '#666', textTransform: 'capitalize' }}>
                      {account.type.replace('_', ' ')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold',
                      color: account.currentBalance >= 0 ? '#4caf50' : '#f44336'
                    }}>
                      ${account.currentBalance.toLocaleString('es-MX')}
                    </p>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                      {account.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 style={{ color:"#c62828" }}>Acciones Rápidas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button className="btn">📝 Agregar Gasto</button>
            <button className="btn">💰 Agregar Ingreso</button>
            <button className="btn">🔄 Transferencia</button>
            <button className="btn">📊 Ver Reportes</button>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored auth data
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