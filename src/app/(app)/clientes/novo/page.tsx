import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; return <div className="page"><PageHeader title="Novo cliente" description="Preencha apenas os dados necessários para o atendimento"/><CustomerForm error={error}/></div>; }
