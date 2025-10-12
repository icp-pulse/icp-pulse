'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Settings, Users, Eye, EyeOff, CheckSquare, Target, AlertCircle, Info } from 'lucide-react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { PollFormValues } from '../poll-form-types'

interface StepConfigurationProps {
  register: UseFormRegister<PollFormValues>
  errors: FieldErrors<PollFormValues>
  setValue: (name: any, value: any) => void
  watch: (name: any) => any
}

export function StepConfiguration({
  register,
  errors,
  setValue,
  watch
}: StepConfigurationProps) {
  const allowAnonymous = watch('allowAnonymous')
  const allowMultiple = watch('allowMultiple')
  const visibility = watch('visibility')
  const maxResponses = watch('maxResponses')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          Poll Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fine-tune how your poll works and who can participate.
        </p>
      </div>

      {/* Configuration Options */}
      <div className="space-y-6">
        {/* Target Respondents */}
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maxResponses" className="text-base font-medium">
                    Target Number of Respondents
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Set a goal for how many votes you want to collect (optional)
                  </p>
                </div>
              </div>
              <div className="max-w-xs">
                <Input
                  id="maxResponses"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 100"
                  {...register('maxResponses', { valueAsNumber: true })}
                />
                {errors.maxResponses && (
                  <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.maxResponses.message}
                  </div>
                )}
              </div>
              {maxResponses && maxResponses > 0 && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Target: {maxResponses} vote{maxResponses !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start gap-3">
            {visibility === 'public' ? (
              <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
            ) : (
              <EyeOff className="h-5 w-5 text-orange-600 mt-0.5" />
            )}
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="visibility" className="text-base font-medium">
                  Poll Visibility
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Control who can see and participate in this poll
                </p>
              </div>
              <Select onValueChange={(value) => setValue('visibility', value)} value={visibility}>
                <SelectTrigger id="visibility" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-gray-500">Anyone can see and vote</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-xs text-gray-500">Only you can see results</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="invite-only">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-medium">Invite Only</div>
                        <div className="text-xs text-gray-500">Requires an invitation to vote</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Voting Options */}
        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-base font-medium">Voting Options</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Customize how users can cast their votes
              </p>
            </div>
          </div>

          <div className="space-y-4 ml-8">
            {/* Anonymous Voting */}
            <div className="flex items-start justify-between space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex-1 space-y-1">
                <Label htmlFor="allowAnonymous" className="text-base font-medium cursor-pointer">
                  Allow Anonymous Votes
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Let users vote without revealing their identity
                </p>
              </div>
              <Switch
                id="allowAnonymous"
                checked={allowAnonymous}
                onCheckedChange={(checked) => setValue('allowAnonymous', checked)}
              />
            </div>

            {/* Multiple Choice */}
            <div className="flex items-start justify-between space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex-1 space-y-1">
                <Label htmlFor="allowMultiple" className="text-base font-medium cursor-pointer">
                  Allow Multiple Selections
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Voters can select more than one option
                </p>
              </div>
              <Switch
                id="allowMultiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setValue('allowMultiple', checked)}
              />
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Configuration Summary
          </h4>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <span>Target Respondents:</span>
              <span className="font-medium">
                {maxResponses && maxResponses > 0 ? `${maxResponses} votes` : 'No limit'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Visibility:</span>
              <span className="font-medium capitalize">{visibility}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Anonymous Voting:</span>
              <span className="font-medium">{allowAnonymous ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Multiple Selections:</span>
              <span className="font-medium">{allowMultiple ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* Tips Box */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-purple-900 dark:text-purple-100">
                Configuration tips
              </h4>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-disc list-inside">
                <li>Anonymous voting can increase honest responses on sensitive topics</li>
                <li>Multiple selections work well for &quot;choose all that apply&quot; questions</li>
                <li>Set a target to help gauge when you have enough responses</li>
                <li>Private polls are great for internal team decisions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
