import {knowledgeAreaId} from '@/lib/knowledgeIdentity';
import styles from './KnowledgeTheme.module.css';

// Scope all knowledge styling to the public knowledge section's content tree.
export default function KnowledgeTheme({area,children}){
 const id=knowledgeAreaId(area);
 if(!id)return children;
 return <div className={styles.root} data-knowledge-area={id}>{children}</div>;
}
