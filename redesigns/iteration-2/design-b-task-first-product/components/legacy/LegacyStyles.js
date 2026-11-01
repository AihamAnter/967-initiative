// Legacy global stylesheet stack, in its original cascade order.
//
// Design B moved these out of the root layout so that redesigned routes (home,
// works, Yemen in numbers + indicator detail) no longer download ~300 kB of
// accumulated override layers. Every route that has not been redesigned yet
// imports this module from its segment layout, so its appearance is unchanged.
// Remove a route's import once that route is migrated to the ui-* tokens.
import '@/app/design-tokens.css';
import '@/app/globals.css';
import '@/app/design-system.css';
import '@/app/platform-refinements.css';
import '@/app/visual-polish.css';
import '@/app/ux-improvements.css';
import '@/app/visual-foundation.css';
import '@/app/completion-polish.css';
import '@/app/team-collaboration.css';
import '@/app/directories.css';
import '@/app/phase5-navigation.css';
import '@/app/knowledge-identity.css';
import '@/app/knowledge-content.css';
import '@/app/knowledge-data.css';
