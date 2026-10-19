import TaskCenter from '@/components/tasks/TaskCenter';
import {pageMetadata} from '@/lib/seo';
export const metadata={...pageMetadata({title:'مركز مهام 967',description:'مساحة العمل الداخلية لفريق مبادرة 967.',path:'/admin/tasks',noindex:true,nofollow:true}),referrer:'no-referrer'};
export default function TasksPage(){return <TaskCenter/>;}
