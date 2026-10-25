import {handleContributionsRequest} from '@/lib/contributionsApi';
import {taskRequestDb} from '@/lib/taskServer';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const GET=request=>handleContributionsRequest(request,taskRequestDb);
