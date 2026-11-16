'use client';
import { useEffect, useState } from 'react';
export type Sender = { name: string; company: string };
export function useSender(): [Sender, (s: Sender) => void] {
  const [s, setS] = useState<Sender>({ name: '', company: '' });
  useEffect(() => { try { const v = localStorage.getItem('pis-sender'); if (v) setS(JSON.parse(v)); } catch {} }, []);
  return [s, (n: Sender) => { setS(n); try { localStorage.setItem('pis-sender', JSON.stringify(n)); } catch {} }];
}
export const download = (name: string, text: string, type: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
