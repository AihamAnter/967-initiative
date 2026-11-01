import SectionBoundary from './SectionBoundary';

// Failure isolation for one card or section.
// - Data failures never reach render: loaders are settled per source on the
//   server, and an empty/failed slot renders its own "unavailable" note.
// - Media failures never throw: SafeImage validates URLs against the shared
//   optimizer policy and swaps to a placeholder on network error.
// - Anything that still throws in the browser (hydration or later updates) is
//   caught here, leaving the rest of the page usable.
// No Suspense wrapper on purpose: it made React stream these sections
// out of order (hidden + moved), which delayed and re-requested images.
export default function Resilient({name, label, quiet = false, children}) {
  return <SectionBoundary name={name} label={label} quiet={quiet}>{children}</SectionBoundary>;
}
