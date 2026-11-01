// Legacy stylesheet bundle, in the exact order the old root layout imported it.
// It is no longer global: only route layouts that have not been redesigned yet
// import this module (see docs/redesign/design-a/README.md, "Rollout").
// Redesigned routes (/, /works, /yemen-in-numbers list + indicator) never load it.
import './design-tokens.css';
import './globals.css';
import './design-system.css';
import './platform-refinements.css';
import './visual-polish.css';
import './ux-improvements.css';
import './visual-foundation.css';
import './completion-polish.css';
import './team-collaboration.css';
import './directories.css';
import './phase5-navigation.css';
import './knowledge-identity.css';
import './knowledge-content.css';
import './knowledge-data.css';
