'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  moduleName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName ?? 'Module'} lỗi:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <p className="font-medium">
            {this.props.moduleName
              ? `Module "${this.props.moduleName}" tạm thời không khả dụng.`
              : 'Tính năng này tạm thời không khả dụng.'}
          </p>
          <p className="mt-1 text-red-400">Vui lòng thử lại sau.</p>
        </div>
      )
    }

    return this.props.children
  }
}
