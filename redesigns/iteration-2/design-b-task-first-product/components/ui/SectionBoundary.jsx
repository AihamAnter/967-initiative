'use client';
import {Component} from 'react';
import {useRouter} from 'next/navigation';
import styles from './SectionBoundary.module.css';

// Per-section error boundary. A rendering failure in one card or section shows
// a scoped, honest message with a retry — the rest of the page keeps working.
class Boundary extends Component {
  constructor(props) {super(props); this.state = {failed: false};}
  static getDerivedStateFromError() {return {failed: true};}
  componentDidCatch(error) {
    try {window.dispatchEvent(new CustomEvent('967:section-error', {detail: {section: this.props.name, message: String(error?.message || '').slice(0, 120)}}));} catch {}
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <SectionUnavailable title={this.props.title} onRetry={() => {this.props.refresh?.(); this.setState({failed: false});}}/>;
  }
}

export function SectionUnavailable({title = 'هذا القسم', onRetry, message}) {
  return <div className={styles.box} role="status">
    <span className={styles.mark} aria-hidden="true">!</span>
    <div><strong>تعذر عرض {title} الآن.</strong><p>{message || 'بقية الصفحة تعمل بشكل طبيعي. يمكنك المحاولة مجدداً.'}</p></div>
    {onRetry && <button type="button" onClick={onRetry}>إعادة المحاولة</button>}
  </div>;
}

export default function SectionBoundary({name, title, children}) {
  const router = useRouter();
  return <Boundary name={name} title={title} refresh={() => router.refresh()}>{children}</Boundary>;
}
