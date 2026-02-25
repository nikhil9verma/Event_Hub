import React from 'react'
import { Link } from 'react-router-dom'

interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-parchment-50">
          <div className="text-center max-w-md p-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="font-serif text-3xl text-ink-900 mb-2">Something went wrong</h1>
            <p className="text-ink-600/60 font-sans text-sm mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Link to="/" className="btn-gold" onClick={() => this.setState({ hasError: false })}>
              Go Home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}