'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, MessageCircle, Send, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'

interface PollPreviewData {
  title: string
  description: string
  options: string[]
  durationDays: number
  fundingAmount?: number
  closesAt: number
  scopeId: number
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  pollCreated?: boolean
  pollId?: string
  optionsGenerated?: boolean
  options?: string[]
  topic?: string
  pollPreview?: boolean
  preview?: PollPreviewData
}

interface AIChatboxProps {
  onOptionsGenerated?: (options: string[]) => void
}

export function AIChatbox({ onOptionsGenerated }: AIChatboxProps = {}) {
  const { isAuthenticated, identity } = useIcpAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I can help you create polls with ease! 🎯\n\nJust tell me:\n• What topic you want to poll about\n• How many days it should run (optional)\n• If you want to fund it with PULSE (optional)\n\nExample: "Create a poll about favorite programming languages, 5 days, fund with 100 PULSE"',
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const toggleChatbox = () => {
    setIsOpen(!isOpen)
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          messages: messages
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        sender: 'ai',
        timestamp: new Date(),
        pollCreated: data.pollCreated,
        pollId: data.pollId,
        optionsGenerated: data.optionsGenerated,
        options: data.options,
        topic: data.topic,
        pollPreview: data.pollPreview,
        preview: data.preview
      }

      setMessages(prev => [...prev, aiResponse])

      // If options were generated and callback provided, call it
      if (data.optionsGenerated && data.options && onOptionsGenerated) {
        onOptionsGenerated(data.options)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again later.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  const createPoll = async (preview: PollPreviewData) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      const authPromptMessage: Message = {
        id: Date.now().toString(),
        content: '🔐 Please connect your wallet first to create a poll.\n\nClick the "Connect Wallet" button in the navigation bar to get started!',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, authPromptMessage])
      return
    }

    setIsLoading(true)

    try {
      // Import required modules
      const { createBackendWithIdentity } = await import('@/lib/icp')

      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Calculate funding details if provided
      let totalFundE8s = 0n
      let rewardPerVoteE8s = 0n
      const fundingEnabled = !!preview.fundingAmount

      if (preview.fundingAmount && preview.fundingAmount > 0) {
        const estimatedResponses = 100
        totalFundE8s = BigInt(Math.floor(preview.fundingAmount * 100_000_000))
        rewardPerVoteE8s = totalFundE8s / BigInt(estimatedResponses)
      }

      // Get token canister ID if funding is enabled
      const tokenCanisterId = fundingEnabled && preview.fundingAmount
        ? process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || ''
        : ''

      // Create poll using backend function
      const pollId = await backend.create_poll(
        'project',
        BigInt(preview.scopeId),
        preview.title,
        preview.description,
        preview.options,
        BigInt(preview.closesAt),
        totalFundE8s,
        fundingEnabled,
        rewardPerVoteE8s > 0n ? [rewardPerVoteE8s] : [],
        tokenCanisterId ? [tokenCanisterId] : []
      )

      console.log('Poll created successfully with ID:', pollId.toString())

      // Verify the poll was actually stored by fetching it back
      try {
        const verifyPoll = await backend.get_poll(pollId)
        if (verifyPoll.length === 0 || !verifyPoll[0]) {
          throw new Error('Poll was created but could not be retrieved. It may not have been stored properly.')
        }
        console.log('Poll verified - successfully stored in backend:', verifyPoll[0])
      } catch (verifyError) {
        console.error('Poll verification failed:', verifyError)
        throw new Error(`Poll created with ID ${pollId.toString()} but verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`)
      }

      const successMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Poll created successfully!\n\n**${preview.title}**\n${preview.description}\n\nYour poll is now live and accepting votes!`,
        sender: 'ai',
        timestamp: new Date(),
        pollCreated: true,
        pollId: pollId.toString()
      }

      setMessages(prev => [...prev, successMessage])
    } catch (error) {
      console.error('Error creating poll:', error)
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: `❌ Failed to create poll: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease make sure you're connected with your wallet and try again.`,
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={toggleChatbox}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all duration-300 ease-in-out z-50 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-110'
        }`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chatbox */}
      <Card className={`fixed bottom-6 right-6 w-80 h-96 shadow-xl transition-all duration-300 ease-in-out z-40 bg-white dark:bg-gray-900 ${
        isOpen
          ? 'scale-100 opacity-100 translate-y-0'
          : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">AI Assistant</span>
              {isAuthenticated ? (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Wallet className="h-3 w-3" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Wallet className="h-3 w-3" />
                  <span>Not connected</span>
                </div>
              )}
            </div>
            <Button
              onClick={toggleChatbox}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : message.pollCreated
                        ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100 border border-green-200 dark:border-green-700'
                        : message.pollPreview
                        ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
                        : message.optionsGenerated
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* Poll Preview */}
                    {message.pollPreview && message.preview && (
                      <div className="mt-3 space-y-2 border-t border-blue-200 dark:border-blue-700 pt-2">
                        <div>
                          <div className="font-semibold text-base mb-1">{message.preview.title}</div>
                          <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">{message.preview.description}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">Options:</div>
                          <div className="space-y-1">
                            {message.preview.options.map((opt, idx) => (
                              <div key={idx} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                {idx + 1}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>⏱️ Duration: {message.preview.durationDays} day{message.preview.durationDays !== 1 ? 's' : ''}</span>
                          {message.preview.fundingAmount && (
                            <span>💰 Fund: {message.preview.fundingAmount} PULSE</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => createPoll(message.preview!)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Creating...' : 'Create Poll'}
                        </Button>
                      </div>
                    )}

                    {message.pollCreated && message.pollId && (
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700 flex gap-2">
                        <Button
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => router.push(`/polls/edit?id=${message.pollId}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex-1"
                          onClick={() => router.push(`/results?pollId=${message.pollId}`)}
                        >
                          View Results
                        </Button>
                      </div>
                    )}
                    {message.optionsGenerated && message.options && onOptionsGenerated && (
                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => onOptionsGenerated(message.options!)}
                        >
                          Use These Options
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isLoading ? "AI is typing..." : "Type your message..."}
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} size="icon" disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}