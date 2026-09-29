export default function Loading() {
  return <div className="page" aria-busy="true" aria-live="polite"><div className="h-9 w-52 bg-gray-200 rounded animate-pulse mb-7"/><div className="grid-cards">{Array.from({length:5},(_,i)=><div className="panel metric animate-pulse" key={i}><div className="h-3 w-24 bg-gray-200 rounded"/><div className="h-7 w-20 bg-gray-200 rounded"/></div>)}</div><span className="sr-only">Carregando conteúdo</span></div>;
}
