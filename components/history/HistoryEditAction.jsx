'use client';
import Link from 'next/link';
import {Pencil} from 'lucide-react';
import {useInlineEditor} from '@/components/inline/InlineEditorProvider';

export default function HistoryEditAction({slug}){
 const {actor}=useInlineEditor();
 if(!actor)return null;
 return <Link className="btn btn-outline" href={'/admin?tab=history&item='+encodeURIComponent(slug)}><Pencil size={16}/> تعديل هذه المادة من لوحة التحرير</Link>;
}
