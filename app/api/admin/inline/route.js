import {handleInlineEditorRequest} from '@/lib/inlineEditorApi';
import {taskRequestDb} from '@/lib/taskServer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=request=>handleInlineEditorRequest(request,taskRequestDb);
export const POST=request=>handleInlineEditorRequest(request,taskRequestDb);
