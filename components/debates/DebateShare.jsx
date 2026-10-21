'use client';
import {useState} from 'react';
export default function DebateShare(){const [message,setMessage]=useState('');return <div className="debate-actions"><button className="btn btn-outline" onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);setMessage('نُسخ رابط المناظرة.');}catch{setMessage('يمكنك نسخ الرابط من شريط العنوان.');}}}>نسخ رابط المناظرة</button><span role="status">{message}</span></div>;}
