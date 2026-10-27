'use client';
import {useEffect,useState} from 'react';
import YemeniFiguresDirectory from './YemeniFiguresDirectory';

export default function YemeniFiguresExplorer({figures,initialGovernorateId=null}){
 const [governorateId,setGovernorateId]=useState(initialGovernorateId);
 useEffect(()=>{
  const sync=()=>setGovernorateId(new URLSearchParams(window.location.search).get('region')||null);
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[]);
 const selectGovernorate=id=>{
  setGovernorateId(id);
  const params=new URLSearchParams(window.location.search);
  if(id)params.set('region',id);else params.delete('region');
  const url='/yemeni-figures'+(params.size?'?'+params:'');
  window.history.replaceState(window.history.state,'',url);
 };
 return <YemeniFiguresDirectory figures={figures} selectedGovernorateId={governorateId} onGovernorateChange={selectGovernorate}/>;
}
