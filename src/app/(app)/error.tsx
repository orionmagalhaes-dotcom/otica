"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page"><div className="panel empty"><strong>Não foi possível carregar esta área</strong><p>Verifique sua conexão e tente novamente. Se o problema continuar, fale com o administrador.</p><button className="btn btn-primary mt-4" onClick={reset}>Tentar novamente</button></div></div>;
}
