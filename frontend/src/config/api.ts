

const API_BASE_URL = 'http://localhost:3001';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Auth
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    
    // Accounts
    accounts: '/api/accounts',
    
    // Transactions
    transactions: '/api/transactions',
    
    // Categories
    categories: '/api/categories',
    
    // Custom Balances
    customBalances: '/api/custom-balances',
  }
};

// Helper function para construir URLs completas
export const buildURL = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};

// Helper específicos para endpoints comunes
export const getURL = {
  login: () => buildURL(API_CONFIG.endpoints.login),
  accounts: () => buildURL(API_CONFIG.endpoints.accounts),
  transactions: () => buildURL(API_CONFIG.endpoints.transactions),
  categories: () => buildURL(API_CONFIG.endpoints.categories),
  customBalances: () => buildURL(API_CONFIG.endpoints.customBalances),
  
  // Para endpoints dinámicos
  accountById: (id: string) => buildURL(`${API_CONFIG.endpoints.accounts}/${id}`),
  paymentCalculation: (id: string) => buildURL(`${API_CONFIG.endpoints.accounts}/${id}/payment-calculation`),

  transactionById: (id: string) => buildURL(`${API_CONFIG.endpoints.transactions}/${id}`),
  transactionByAccountId: (accountId: string) => buildURL(`${API_CONFIG.endpoints.transactions}?accountId=${accountId}`),
};