// Only counts of unread private messages and incoming conversation requests.
// Never copy message contents or account identifiers into the global header.
export function safeMessageCount(value) {
 const number = Number(value);
 return Number.isSafeInteger(number) && number>0 ? number : 0;
}
export function messageBadgeCount(summary) {
 const unread=safeMessageCount(summary?.unread);
 const requests=safeMessageCount(summary?.requests);
 return Math.min(Number.MAX_SAFE_INTEGER,unread+requests);
}
export function messageBadgeLabel(count) {
 return count>99 ? '99+' : String(safeMessageCount(count));
}
