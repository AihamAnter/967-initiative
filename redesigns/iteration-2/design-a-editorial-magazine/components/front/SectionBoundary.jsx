'use client';
import {Component} from 'react';

// Contains a render failure to one card or section. The rest of the page,
// navigation and search keep working; the visitor sees what is unavailable.
export default class SectionBoundary extends Component {
  constructor(props) { super(props); this.state = {failed: false}; }
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error) {
    try { window.dispatchEvent(new CustomEvent('967:section-error', {detail: {section: this.props.name, message: String(error?.message || '').slice(0, 120)}})); } catch {}
  }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;
    return <p className="ed-unavailable" role="status">{this.props.label || 'تعذّر عرض هذا الجزء الآن.'}</p>;
  }
}
