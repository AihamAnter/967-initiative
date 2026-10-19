import {handleTaskRequest} from '@/lib/taskApi';
import {taskRequestDb} from '@/lib/taskServer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=request=>handleTaskRequest(request,taskRequestDb);
export const POST=request=>handleTaskRequest(request,taskRequestDb);
