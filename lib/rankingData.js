import 'server-only';
import {cache} from 'react';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {serverDb} from './supabase-server';
import {defaultRankingIndicators} from './rankingCatalog.js';
import {createRankingRepository} from './rankingRepository.js';
import {isRankingSlug} from './rankings.js';

async function readBundledDataset(slug) {
  if (!isRankingSlug(slug)) throw new Error('مسار بيانات الترتيب غير صالح.');
  const filename = path.join(process.cwd(), 'data', 'rankings', `${slug}.json`);
  try {
    const file = await stat(filename);
    if (file.size > 5000000) throw new Error('ملف بيانات الترتيب أكبر من الحد المسموح.');
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

const repository = createRankingRepository({getDb: serverDb, defaultIndicators: defaultRankingIndicators, readBundledDataset});
const loadCatalog = cache(includeDrafts => repository.getRankingCatalog({includeDrafts}));
export function getRankingCatalog({includeDrafts = false} = {}) { return loadCatalog(includeDrafts); }
export const getRankingDataset = cache(repository.getRankingDataset);
