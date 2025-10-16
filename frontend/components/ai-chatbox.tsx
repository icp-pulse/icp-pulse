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
  isOpen?: boolean
  onToggle?: () => void
}

export function AIChatbox({ onOptionsGenerated, isOpen: externalIsOpen, onToggle }: AIChatboxProps = {}) {
  const { isAuthenticated, identity } = useIcpAuth()
  const router = useRouter()
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = onToggle || setInternalIsOpen
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
    if (onToggle) {
      onToggle()
    } else {
      setIsOpen(!isOpen)
    }
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
      // Call backend canister directly for chat
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Build conversation history for context (limit to last 5 messages)
      const conversationHistory: [string, string][] = messages.slice(-5).map(msg => [
        msg.sender === 'user' ? 'user' : 'assistant',
        msg.content
      ])

      console.log(`Calling backend canister for chat with message: "${currentInput}"`)

      // Call the backend canister's chat_message function
      const result = await backend.chat_message(currentInput, conversationHistory)

      if ('ok' in result) {
        const aiMessage = result.ok
        console.log(`Successfully got chat response from backend canister`)

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: aiMessage,
          sender: 'ai',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiResponse])
      } else {
        console.error('Backend canister returned error:', result.err)
        throw new Error(result.err || 'Failed to get AI response from canister')
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

      // Import Principal for custom token polls
      const { Principal } = await import('@dfinity/principal')

      // Create poll using appropriate backend function
      let pollId
      if (fundingEnabled && tokenCanisterId) {
        // For self-funded polls, approve tokens first
        if (totalFundE8s > 0n) {
          const backendCanisterId = canisterId

          // Add fee buffer
          const feeBuffer = 20001n
          const approvalAmount = totalFundE8s + feeBuffer

          // Check if using Plug wallet
          const isPlugWallet = typeof window !== 'undefined' && window.ic?.plug

          if (isPlugWallet && window.ic?.plug) {
            // Use Plug wallet for approval
            const whitelist = [tokenCanisterId, backendCanisterId]
            const connected = await (window.ic.plug as any).requestConnect({ whitelist })

            if (!connected) {
              throw new Error('Failed to connect to Plug wallet')
            }

            const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')
            const tokenActor = await window.ic.plug.createActor({
              canisterId: tokenCanisterId,
              interfaceFactory: tokenIdl,
            })

            const approveResult = await tokenActor.icrc2_approve({
              from_subaccount: [],
              spender: {
                owner: Principal.fromText(backendCanisterId),
                subaccount: [],
              },
              amount: approvalAmount,
              expected_allowance: [],
              expires_at: [],
              fee: [],
              memo: [],
              created_at_time: [],
            })

            if ('Err' in approveResult || approveResult.Err !== undefined) {
              throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
            }
          } else {
            // Use identity-based approval for Internet Identity
            const { Actor, HttpAgent } = await import('@dfinity/agent')
            const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')

            const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local'
            const agent = HttpAgent.createSync({
              host,
              identity: identity!,
              verifyQuerySignatures: !isLocal
            })

            if (isLocal) {
              await agent.fetchRootKey()
            }

            const tokenActor = Actor.createActor(tokenIdl, {
              agent,
              canisterId: tokenCanisterId,
            })

            const approveResult = await (tokenActor as any).icrc2_approve({
              from_subaccount: [],
              spender: {
                owner: Principal.fromText(backendCanisterId),
                subaccount: [],
              },
              amount: approvalAmount,
              expected_allowance: [],
              expires_at: [],
              fee: [],
              memo: [],
              created_at_time: [],
            })

            if ('Err' in approveResult || approveResult.Err !== undefined) {
              throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
            }
          }

          // Wait for approval to be processed
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // Use create_custom_token_poll for custom tokens
        const result = await backend.create_custom_token_poll(
          'project',
          BigInt(preview.scopeId),
          preview.title,
          preview.description,
          preview.options,
          BigInt(preview.closesAt),
          [Principal.fromText(tokenCanisterId)],
          totalFundE8s,
          rewardPerVoteE8s,
          'self-funded',
          [], // maxResponses
          [], // allowAnonymous
          [], // allowMultiple
          [], // visibility
          []  // rewardDistributionType
        )

        if ('err' in result) {
          throw new Error(result.err)
        }
        pollId = result.ok
      } else {
        // Use create_poll for non-funded polls
        pollId = await backend.create_poll(
          'project',
          BigInt(preview.scopeId),
          preview.title,
          preview.description,
          preview.options,
          BigInt(preview.closesAt),
          totalFundE8s,
          fundingEnabled,
          rewardPerVoteE8s > 0n ? [rewardPerVoteE8s] : [],
          [], // fundingType
          [], // maxResponses
          [], // allowAnonymous
          [], // allowMultiple
          [], // visibility
          []  // rewardDistributionType
        )
      }

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
      {/* Floating Button - Hidden on mobile/tablet */}
      <Button
        onClick={toggleChatbox}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all duration-300 ease-in-out z-40 hidden lg:flex lg:items-center lg:justify-center ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-110'
        }`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chatbox - Positioned above mobile nav on mobile/tablet, floating on desktop */}
      <Card className={`fixed bottom-[90px] lg:bottom-6 lg:right-6 right-4 left-4 lg:left-auto lg:w-80 w-auto h-96 shadow-xl transition-all duration-300 ease-in-out z-50 bg-white dark:bg-gray-900 ${
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
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                        <Button
                          size="sm"
                          className="text-xs w-full"
                          onClick={() => router.push(`/results?pollId=${message.pollId}`)}
                        >
                          View Details
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