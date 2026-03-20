import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#16162a', color: '#ff4444', borderRadius: '8px', border: '1px solid #ff4444', margin: '24px' }}>
          <h3>Something went wrong in the 3D Canvas</h3>
          <p style={{fontFamily: 'monospace', fontSize: '12px', marginTop: '12px'}}>{this.state.error?.toString()}</p>
          <button 
            style={{marginTop: '16px', padding: '8px 16px', backgroundColor: '#333', color: '#fff', borderRadius: '4px'}}
            onClick={() => this.setState({hasError: false})}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
