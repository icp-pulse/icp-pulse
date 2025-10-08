"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScrollReveal } from './scroll-reveal'

export function QuickActionSection() {
  const [question, setQuestion] = useState('')
  const router = useRouter()

  const handleCreatePoll = () => {
    if (question.trim()) {
      // Redirect to poll creation with pre-filled question
      router.push(`/polls/new?title=${encodeURIComponent(question)}`)
    } else {
      // Just go to poll creation page
      router.push('/polls/new')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && question.trim()) {
      handleCreatePoll()
    }
  }

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Try it now - No signup required
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Get Instant Feedback in{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              30 Seconds
            </span>
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Type your question, share with your audience, and watch real-time results pour in.
            It's that simple.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <Card className="border-2 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="What do you want to ask your audience?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-14 text-lg px-6 border-2 focus:border-blue-500 dark:bg-gray-800"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-2">
                    Example: "What feature should we build next?" or "Which logo design do you prefer?"
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleCreatePoll}
                  className="h-14 px-8 text-lg whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Create Poll
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">30s</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Average creation time</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">Real-time</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Live result updates</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">∞</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unlimited responses</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={400} className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🔐 Secured by blockchain • 🌐 Share anywhere • 📊 Beautiful analytics
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
