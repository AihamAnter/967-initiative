import {redirect} from 'next/navigation';

// Friend-duel creation lives beside Start on each of the nine games.
// Preserve old saved /games/friends links with a helpful redirect.
export default function Page(){redirect('/games');}
