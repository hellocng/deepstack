import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TenantHeader } from '@/components/tenant-header'
import { TenantNavigation } from '@/components/tenant-navigation'

interface TenantLayoutProps {
  children: React.ReactNode
  params: {
    tenant: string
  }
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const supabase = await createClient()
  
  // Get tenant information
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('code', params.tenant)
    .eq('is_active', true)
    .single()

  if (error || !tenant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <TenantHeader tenant={tenant} />
      <TenantNavigation tenant={tenant} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
