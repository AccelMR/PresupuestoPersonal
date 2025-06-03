// frontend/src/components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Cargando...", 
  size = 'medium' 
}) => {
  const sizeMap = {
    small: '20px',
    medium: '40px', 
    large: '60px'
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      gap: '1rem'
    }}>
      <div 
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #1976d2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{ margin: 0, color: '#666' }}>{message}</p>
      
      {/* CSS Animation - you'll need to add this to your CSS file */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;