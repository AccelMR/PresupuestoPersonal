import React from 'react';

// frontend/src/components/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
}

// Modal Component - Like a template wrapper in C++
const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = '800px',
  maxHeight = '90vh'
}) => {
  if (!isOpen) return null;

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={(e) => {
        // Close modal when clicking outside
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="card" 
        style={{ 
          width: '100%',
          maxWidth, 
          margin: 0,
          maxHeight,
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        {title && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #eee'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
                padding: '0.5rem',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;