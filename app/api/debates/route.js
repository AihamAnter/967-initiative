import {handleDebateRequest} from '@/lib/debateApi';
import {taskRequestDb} from '@/lib/taskServer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=request=>handleDebateRequest(request,taskRequestDb);
export const POST=request=>handleDebateRequest(request,taskRequestDb);
