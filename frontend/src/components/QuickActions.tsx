// frontend/src/components/QuickActions.tsx
interface QuickAction {
  label: string;
  icon: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

// QuickActions Component - Like an array of function pointers in C++
const QuickActions: React.FC<QuickActionsProps> = ({ actions, title = "Acciones Rápidas" }) => {
  return (
    <div className="card">
      <h2 style={{ color: "#c62828", marginBottom: '1.5rem' }}>{title}</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        {actions.map((action, index) => (
          <button 
            key={index}
            className="btn" 
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              background: action.color || '#1976d2',
              opacity: action.disabled ? 0.6 : 1,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem',
              fontSize: '1rem'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;