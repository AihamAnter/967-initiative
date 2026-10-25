'use client';

import {useSyncExternalStore} from 'react';
import {parseReadingList, readingContentItem, READING_LIST_KEY, READING_LIST_LIMIT} from '@/lib/readingList';

const CHANGE_EVENT = '967:reading-list-change';
const SERVER = {items:[], ready:false, available:true};
let cachedRaw = Symbol('unread');
let cachedSnapshot = SERVER;

function getSnapshot() {
  let raw;
  try { raw = localStorage.getItem(READING_LIST_KEY); }
  catch {
    if (cachedRaw !== false) { cachedRaw = false;cachedSnapshot = {items:[],ready:true,available:false}; }
    return cachedSnapshot;
  }
  if (raw !== cachedRaw) { cachedRaw = raw;cachedSnapshot = {items:parseReadingList(raw),ready:true,available:true}; }
  return cachedSnapshot;
}

function subscribe(listener) {
  const storage = event => {if (event.key === READING_LIST_KEY || event.key === null) listener();};
  window.addEventListener('storage', storage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {window.removeEventListener('storage', storage);window.removeEventListener(CHANGE_EVENT, listener);};
}

function write(items) {
  localStorage.setItem(READING_LIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function toggleReadingItem(value) {
  const item = readingContentItem(value);
  if (!item) throw new Error('تعذر حفظ هذا المحتوى.');
  const current = parseReadingList(localStorage.getItem(READING_LIST_KEY));
  if (current.some(entry => entry.href === item.href)) {write(current.filter(entry => entry.href !== item.href));return false;}
  if (current.length >= READING_LIST_LIMIT) throw new Error('قائمتك تضم 100 عنصر. أزل عنصراً قبل حفظ محتوى جديد.');
  write([item,...current]);
  return true;
}

export function removeReadingItem(href) {
  write(parseReadingList(localStorage.getItem(READING_LIST_KEY)).filter(item => item.href !== href));
}

export default function useReadingList() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}
