import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#DC2626' }}>Something went wrong.</h1>
          <p style={{ color: '#4B5563', marginBottom: 20 }}>An unexpected error occurred in the application.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: '#1E3A8A', color: 'white', padding: '10px 20px', 
              border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' 
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
