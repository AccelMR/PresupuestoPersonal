// frontend/src/components/TransactionListModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { getURL } from '../config/api'

// Tipos para las transacciones
interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'payment' | 'adjustment';
  paymentMethod: string;
  transactionDate: string;
  categoryId?: {
    _id: string;
    name: string;
    color: string;
    icon?: string;
  };
  merchant?: string;
  location?: string;
  notes?: string;
  tags?: string[];
}

// Filtros para las transacciones
interface FilterState {
  dateStart: string;
  dateEnd: string;
  amountMin: string;
  amountMax: string;
  type: string;
  sortBy: 'date' | 'amount' | 'description';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
}

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    _id: string;
    name: string;
    type: string;
    currentBalance: number;
  } | null;
  token: string;
}

const TransactionListModal: React.FC<TransactionListModalProps> = ({
  isOpen,
  onClose,
  account,
  token
}) => {
  // Estados principales
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de filtrado
  const [filters, setFilters] = useState<FilterState>({
    dateStart: '',
    dateEnd: '',
    amountMin: '',
    amountMax: '',
    type: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    searchTerm: ''
  });

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Fetch transactions cuando se abre el modal
  useEffect(() => {
    if (isOpen && account) {
      fetchTransactions();
      resetFilters();
    }
  }, [isOpen, account]);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  // Función para obtener transacciones
  const fetchTransactions = async () => {
    if (!account) return;
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        getURL.transactionByAccountId(account._id) + '&limit=1000',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setTransactions(data.data || []);
      } else {
        setError(data.message || 'Error fetching transactions');
      }
    } 
    catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching transactions:', err);
    } 
    finally {
      setLoading(false);
    }
  };

  // Función para resetear filtros
  const resetFilters = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    setFilters({
      dateStart: thirtyDaysAgo.toISOString().split('T')[0],
      dateEnd: today.toISOString().split('T')[0],
      amountMin: '',
      amountMax: '',
      type: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      searchTerm: ''
    });
    setCurrentPage(1);
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = [...transactions];

    // Filtro por fecha
    if (filters.dateStart) {
      filtered = filtered.filter(t =>
        new Date(t.transactionDate) >= new Date(filters.dateStart)
      );
    }
    if (filters.dateEnd) {
      filtered = filtered.filter(t =>
        new Date(t.transactionDate) <= new Date(filters.dateEnd + 'T23:59:59')
      );
    }

    // Filtro por cantidad
    if (filters.amountMin) {
      filtered = filtered.filter(t =>
        Math.abs(t.amount) >= parseFloat(filters.amountMin)
      );
    }
    if (filters.amountMax) {
      filtered = filtered.filter(t =>
        Math.abs(t.amount) <= parseFloat(filters.amountMax)
      );
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.merchant?.toLowerCase().includes(searchLower) ||
        t.categoryId?.name.toLowerCase().includes(searchLower)
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        default:
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Función para cambiar filtros
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Calcular paginación
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para obtener icono de tipo de transacción
  const getTransactionIcon = (type: string) => {
    const icons = {
      income: '💰',
      expense: '💸',
      transfer: '🔄',
      payment: '💳',
      adjustment: '⚖️'
    };
    return icons[type as keyof typeof icons] || '💼';
  };

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📊 Transacciones - ${account.name}`}
      maxWidth="1000px"
      maxHeight="90vh"
    >
      <div style={{ color: '#111' }}>
        {error && <ErrorMessage message={error} onRetry={fetchTransactions} />}

        {/* Resumen de la cuenta */}
        <div style={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Balance Actual</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {formatCurrency(account.currentBalance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Transacciones</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {filteredTransactions.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Período Mostrado</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {filters.dateStart && filters.dateEnd ?
                  `${formatDate(filters.dateStart)} - ${formatDate(filters.dateEnd)}` :
                  'Todas las fechas'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Panel de filtros */}
        <div style={{
          background: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2' }}>🔍 Filtros</h3>

          {/* Primera fila de filtros */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Fecha Inicio:
              </label>
              <input
                type="date"
                value={filters.dateStart}
                onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Fecha Fin:
              </label>
              <input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Tipo:
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
                <option value="transfer">Transferencias</option>
                <option value="payment">Pagos</option>
              </select>
            </div>
          </div>

          {/* Segunda fila de filtros */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Cantidad Mín:
              </label>
              <input
                type="number"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                placeholder="0.00"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Cantidad Máx:
              </label>
              <input
                type="number"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                placeholder="999999.99"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Ordenar por:
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as 'date' | 'amount' | 'description')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <option value="date">Fecha</option>
                <option value="amount">Cantidad</option>
                <option value="description">Descripción</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
                Orden:
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#111' }}>
              Buscar:
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Buscar en descripción, comercio o categoría..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={resetFilters}
              className="btn-secondary btn"
              style={{ padding: '0.5rem 1rem' }}
            >
              🔄 Resetear Filtros
            </button>
            <button
              onClick={fetchTransactions}
              className="btn"
              style={{ padding: '0.5rem 1rem' }}
            >
              📊 Actualizar
            </button>
          </div>
        </div>

        {/* Lista de transacciones */}
        {loading ? (
          <LoadingSpinner message="Cargando transacciones..." />
        ) : (
          <div>
            {/* Header de la lista */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, color: '#1976d2' }}>
                📋 Transacciones ({filteredTransactions.length})
              </h3>

              {/* Paginación */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: currentPage === 1 ? '#f5f5f5' : 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ←
                  </button>
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: currentPage === totalPages ? '#f5f5f5' : 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {/* Lista de transacciones */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {paginatedTransactions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                  <h3>No se encontraron transacciones</h3>
                  <p>Intenta ajustar los filtros o el rango de fechas</p>
                </div>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      background: 'white',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <div style={{ fontSize: '1.5rem' }}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#333' }}>
                          {transaction.description}
                          {transaction.type === 'transfer' && (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              color: transaction.accountId === account?._id ? '#4caf50' : '#f44336'
                            }}>
                              {transaction.accountId === account?._id ? ' -> Enviado' : ' <- Recibido'}
                            </span>
                          )}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#666' }}>
                          <span>{formatDate(transaction.transactionDate)}</span>
                          {transaction.merchant && <span>📍 {transaction.merchant}</span>}
                          {transaction.categoryId && (
                            <span style={{ color: transaction.categoryId.color }}>
                              {transaction.categoryId.icon} {transaction.categoryId.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: transaction.amount >= 0 ? '#4caf50' : '#f44336'
                      }}>
                        {formatCurrency(transaction.amount)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>
                        {transaction.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Botón cerrar */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionListModal;