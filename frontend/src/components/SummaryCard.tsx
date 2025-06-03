// frontend/src/components/SummaryCard.tsx
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  color?: string;
  icon?: string;
  subtitle?: string;
}

// SummaryCard Component - Like a data structure in C++
const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  color = '#1976d2', 
  icon,
  subtitle 
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('es-MX');
    }
    return val;
  };

  return (
    <div className="card" style={{ textAlign: 'center', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {icon && (
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {icon}
        </div>
      )}
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        margin: 0, 
        color: color,
        lineHeight: 1
      }}>
        {formatValue(value)}
      </p>
      {subtitle && (
        <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.8rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SummaryCard;