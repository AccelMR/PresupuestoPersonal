// frontend/src/components/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry, 
  title = "Error" 
}) => {
  return (
    <div style={{ 
      background: '#ffebee', 
      color: '#c62828', 
      padding: '1.5rem', 
      borderRadius: '8px',
      border: '1px solid #ffcdd2',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
      <h3 style={{ margin: '0 0 1rem 0', color: '#c62828' }}>{title}</h3>
      <p style={{ margin: '0 0 1rem 0' }}>{message}</p>
      {onRetry && (
        <button 
          className="btn" 
          onClick={onRetry}
          style={{ 
            background: '#c62828',
            marginTop: '1rem'
          }}
        >
          🔄 Reintentar
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;