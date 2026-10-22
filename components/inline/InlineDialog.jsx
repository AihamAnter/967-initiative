'use client';
import {useEffect,useId,useRef} from 'react';
import {X} from 'lucide-react';

export default function InlineDialog({title,children,onClose,busy=false,wide=false}){
 const ref=useRef(null),titleId=useId();
 useEffect(()=>{const node=ref.current,previous=document.activeElement;node.showModal();return()=>{node.close();if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className={'inline-dialog'+(wide?' inline-dialog-wide':'')} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!busy)onClose();}} onClick={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}><header><h2 id={titleId}>{title}</h2><button className="inline-icon-button" type="button" disabled={busy} aria-label="إغلاق النافذة" onClick={onClose}><X size={22}/></button></header><div className="inline-dialog-body">{children}</div></dialog>;
}
