import React from 'react';
import { showFatalErrorScreen } from '../utils/fatalErrorScreen';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error, info) {
    showFatalErrorScreen(error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}
