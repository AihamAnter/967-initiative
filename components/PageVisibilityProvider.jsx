'use client';
import {createContext,useContext,useMemo} from 'react';
import {pageIsVisible} from '@/lib/pageVisibility';

const Context=createContext({visibility:{},pages:[]});
export function usePageVisibility(){const {visibility,pages}=useContext(Context);return useMemo(()=>({isVisible:href=>pageIsVisible(href,visibility,pages),visibility}),[visibility,pages]);}
export default function PageVisibilityProvider({visibility,pages,children}){return <Context.Provider value={{visibility,pages}}>{children}</Context.Provider>;}
