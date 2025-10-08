"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Sparkles, Shield, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function QuickActionHero() {
  const [question, setQuestion] = useState('')
  const router = useRouter()

  const handleGetAnswers = () => {
    if (question.trim()) {
      router.push(`/polls/new?title=${encodeURIComponent(question)}`)
    } else {
      router.push('/polls/new')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && question.trim()) {
      handleGetAnswers()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
        {/* Input and Button - Pill Design */}
        <div className="flex flex-col sm:flex-row mb-6">
          <div className="flex flex-1 border-2 border-gray-200 dark:border-gray-700 rounded-full overflow-hidden focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
            <Input
              type="text"
              placeholder="What question do you want answered? e.g., Which feature should we build next?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 text-base px-6 flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="lg"
              onClick={handleGetAnswers}
              className="h-14 px-8 whitespace-nowrap bg-blue-600 hover:bg-blue-700 rounded-none border-0"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Answers
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Lock className="w-4 h-4" />
            <span>Powered by blockchain</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>Anonymous responses</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span>Instant results</span>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">No registration required</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Tamper-proof results</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Real-time analytics</span>
          </div>
        </div>
      </div>
    </div>
  )
}
