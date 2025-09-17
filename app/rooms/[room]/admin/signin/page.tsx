import { Suspense } from 'react'
import { AdminSignInForm } from '@/components/forms/admin-signin-form'

export default function AdminSignInPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminSignInForm />
    </Suspense>
  )
}
