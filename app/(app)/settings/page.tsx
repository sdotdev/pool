import { getCurrentProfile } from '@/lib/dal'
import { SettingsForm } from '@/components/settings-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const profile = await getCurrentProfile()
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsForm profile={profile} />
    </div>
  )
}
