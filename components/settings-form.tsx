'use client'

import { useState, useTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { updateDisplayName, signOut, leaveBoard, deleteAccount } from '@/lib/actions/profile'
import type { Profile } from '@/lib/types'

export function SettingsForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const saveName = () => {
    setNameError(null)
    setNameSaved(false)
    startTransition(async () => {
      try {
        await updateDisplayName(displayName)
        setNameSaved(true)
        setTimeout(() => setNameSaved(false), 2000)
      } catch {
        setNameError('Failed to save. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{(profile.display_name ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium capitalize">{profile.role}</p>
              <p className="text-sm text-muted-foreground">{profile.points} points</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="display-name">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={64}
              />
              <Button onClick={saveName} disabled={pending} size="sm">
                {nameSaved ? 'Saved!' : 'Save'}
              </Button>
            </div>
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">Sign out</Button>
          </form>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                Leave board
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this board?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll lose access to all tasks and will need a new invite code to rejoin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={leaveBoard}>
                  <AlertDialogAction asChild>
                    <Button type="submit" variant="destructive">Leave board</Button>
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account and all your data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteAccount}>
                  <AlertDialogAction asChild>
                    <Button type="submit" variant="destructive">Delete account</Button>
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
