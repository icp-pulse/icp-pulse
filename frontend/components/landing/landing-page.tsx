"use client"

import { useState } from 'react'
import { ScrollReveal } from './scroll-reveal'
import { StatsSection } from './stats-section'
import { QuickActionSection } from './quick-action-section'
import { QuickActionHero } from './quick-action-hero'
import { HowItWorksSection } from './how-it-works-section'
import { WhyChooseSection } from './why-choose-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Vote,
  FileText,
  FolderOpen,
  BarChart3,
  Users,
  Shield,
  Zap,
  Globe,
  ChevronDown,
  Check,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  Settings,
  Sparkles,
  Gift,
  X
} from 'lucide-react'

export function LandingPage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [showBanner, setShowBanner] = useState(true)

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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Early Adopter Airdrop Banner */}
      {showBanner && (
        <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-medium">
                    <span className="font-bold">🎉 Early Adopter Rewards!</span> Claim your PULSE tokens as a thank you for being among our first users. Campaign runs for 90 days.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/airdrop">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white text-purple-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Claim Now
                  </Button>
                </Link>
                <button
                  onClick={() => setShowBanner(false)}
                  className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Close banner"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 border-blue-200">
              🚀 Built on Internet Computer Protocol
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Context-Aware
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> 
                {' '}Polls & Surveys
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Organize feedback under Projects and Products. Create intelligent surveys and polls
              that adapt to your organization&apos;s needs, all powered by blockchain technology.
            </p>

            {/* Input and Button Pill */}
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex flex-1 border-2 border-gray-300 dark:border-gray-600 rounded-full overflow-hidden focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors shadow-lg">
                <Input
                  type="text"
                  placeholder="What question do you want answered? e.g., Which feature should we build next?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-16 text-base px-6 flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white dark:bg-gray-800"
                />
                <Button
                  size="lg"
                  onClick={handleGetAnswers}
                  className="h-16 px-8 whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-none border-0 text-base font-semibold"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Answers
                </Button>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">No registration required</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Tamper-proof results</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Real-time analytics</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Free to start • 2-minute setup
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Why Choose True Pulse Section */}
      <WhyChooseSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Statistics Section */}
      <StatsSection />

      {/* Getting Started Section - MOVED BELOW */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Start Exploring Now
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Choose your path to get started with context-aware feedback collection
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ScrollReveal delay={100}>
              <Card className="text-center p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">I&apos;m a Participant</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Looking to respond to surveys or vote on polls? Browse available content and contribute your feedback.
                </p>
                <div className="space-y-3">
                  <Link href="/projects" className="block">
                    <Button variant="outline" className="w-full">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Browse Projects
                    </Button>
                  </Link>
                  <Link href="/surveys" className="block">
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Take Surveys
                    </Button>
                  </Link>
                  <Link href="/polls" className="block">
                    <Button variant="outline" className="w-full">
                      <Vote className="w-4 h-4 mr-2" />
                      Vote on Polls
                    </Button>
                  </Link>
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <Card className="text-center p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-200">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">I&apos;m a Creator</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Ready to create surveys and polls? Start by setting up a project to organize your feedback collection.
                </p>
                <div className="space-y-3">
                  <Link href="/projects/new" className="block">
                    <Button variant="outline" className="w-full">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                  <Link href="/surveys/new" className="block">
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      New Survey
                    </Button>
                  </Link>
                  <Link href="/polls/new" className="block">
                    <Button variant="outline" className="w-full">
                      <Vote className="w-4 h-4 mr-2" />
                      New Poll
                    </Button>
                  </Link>
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <Card className="text-center p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-green-200">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Settings className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">I&apos;m an Admin</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Managing content and analyzing results? Access your dashboard to oversee all projects, surveys, and polls.
                </p>
                <div className="space-y-3">
                  <Link href="/admin" className="block">
                    <Button variant="outline" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  </Link>
                  <Link href="/admin?tab=projects" className="block">
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </div>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to gather feedback
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful features designed to make feedback collection simple, organized, and actionable.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FolderOpen,
                title: 'Project Organization',
                description: 'Group related surveys and polls under projects for better organization and context.',
                color: 'blue'
              },
              {
                icon: FileText,
                title: 'Advanced Surveys',
                description: 'Create complex surveys with conditional logic, multiple question types, and validation.',
                color: 'purple'
              },
              {
                icon: Vote,
                title: 'Quick Polls',
                description: 'Get instant feedback with simple polls. Perfect for quick decisions and team votes.',
                color: 'green'
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                description: 'Track responses, completion rates, and analyze results with detailed insights.',
                color: 'orange'
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Invite team members, manage permissions, and collaborate on feedback collection.',
                color: 'pink'
              },
              {
                icon: Shield,
                title: 'Blockchain Security',
                description: 'Built on ICP for maximum security, transparency, and data immutability.',
                color: 'indigo'
              }
            ].map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 100}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 bg-${feature.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Organize with Projects
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Keep your surveys and polls organized by grouping them under projects. 
              Perfect for product development, research studies, or team initiatives.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-6">Project-Based Organization</h3>
                  <ul className="space-y-4">
                    {[
                      'Group related surveys and polls together',
                      'Track project-specific metrics and goals',
                      'Manage team access and permissions per project',
                      'Export consolidated reports for stakeholders'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/projects">
                    <Button className="mt-8">
                      Explore Projects
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="space-y-4">
                    {[
                      { name: 'Customer Feedback Q4', surveys: 3, polls: 2, status: 'Active' },
                      { name: 'Product Research', surveys: 5, polls: 1, status: 'In Progress' },
                      { name: 'Employee Engagement', surveys: 2, polls: 4, status: 'Completed' }
                    ].map((project, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{project.name}</h4>
                          <Badge className="text-xs">{project.status}</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{project.surveys} Surveys</span>
                          <span>{project.polls} Polls</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Surveys Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <FileText className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-xl font-semibold">Survey Builder</h3>
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">Multiple Choice Question</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">What&apos;s your preferred meeting time?</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium">Rating Scale</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Rate your satisfaction (1-10)</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium">Open Text</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Additional comments or suggestions</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Advanced Survey Features
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                  Create sophisticated surveys with conditional logic, multiple question types, 
                  and advanced validation rules.
                </p>
                <ul className="space-y-4">
                  {[
                    'Conditional logic and branching',
                    'Multiple question types (MCQ, rating, text, etc.)',
                    'Response validation and required fields',
                    'Progress tracking and completion rates',
                    'Anonymous and identified responses',
                    'Export to multiple formats'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Polls Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Quick Decision Making
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                  Get instant feedback with simple, effective polls. Perfect for team decisions, 
                  quick votes, and gathering immediate input.
                </p>
                <ul className="space-y-4">
                  {[
                    'Single and multiple choice polls',
                    'Real-time result updates',
                    'Anonymous voting options',
                    'Time-limited polls with deadlines',
                    'Visual result charts and graphs',
                    'Easy sharing and distribution'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Vote className="w-8 h-8 text-purple-600 mr-3" />
                    <h3 className="text-xl font-semibold">Team Lunch Poll</h3>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Where should we go for lunch this Friday?</p>
                <div className="space-y-3">
                  {[
                    { option: 'Italian Restaurant', votes: 12, percentage: 40 },
                    { option: 'Sushi Bar', votes: 9, percentage: 30 },
                    { option: 'Burger Joint', votes: 6, percentage: 20 },
                    { option: 'Healthy Salads', votes: 3, percentage: 10 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.option}</span>
                          <span className="text-sm text-gray-600">{item.votes} votes</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about our platform
            </p>
          </ScrollReveal>

          <div className="space-y-8">
            {[
              {
                question: 'What makes this different from other survey tools?',
                answer: 'Our platform is built on the Internet Computer Protocol, providing unmatched security, transparency, and data ownership. Plus, our project-based organization makes managing multiple surveys and polls much more intuitive.'
              },
              {
                question: 'Is my data secure on the blockchain?',
                answer: 'Absolutely. All data is stored securely on the Internet Computer blockchain, ensuring immutability, transparency, and protection against data breaches. You maintain full ownership of your data.'
              },
              {
                question: 'Can I collaborate with my team?',
                answer: 'Yes! You can invite team members to projects, manage permissions, and collaborate on survey and poll creation. Team members can have different access levels based on their role.'
              },
              {
                question: 'How do I organize multiple surveys and polls?',
                answer: 'Use our project-based organization system. Group related surveys and polls under projects, making it easy to track progress, analyze results, and manage team access for specific initiatives.'
              },
              {
                question: 'Can I export my data and results?',
                answer: 'Yes, you can export survey responses and poll results in various formats including CSV, Excel, and PDF. Generate comprehensive reports for stakeholders and decision-makers.'
              }
            ].map((faq, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Create Your First Poll?
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Join thousands of organizations using True Pulse for transparent, secure polling
              </p>

              {/* Input and Button Pill */}
              <div className="max-w-2xl mx-auto mb-4">
                <div className="flex flex-col sm:flex-row items-center gap-0 bg-white rounded-full overflow-hidden shadow-lg">
                  <Input
                    type="text"
                    placeholder="Enter your poll question here..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-14 px-6 flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900"
                  />
                  <Button
                    onClick={handleGetAnswers}
                    className="h-14 px-8 bg-black hover:bg-gray-900 text-white rounded-none sm:rounded-r-full w-full sm:w-auto"
                  >
                    Start Polling
                  </Button>
                </div>
              </div>

              <p className="text-sm opacity-80">
                No credit card required • Deploy in seconds • Blockchain verified
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Passionate builders creating the future of feedback collection
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'East',
                role: 'Co-founder',
                bio: 'East co-founded TruePulse and brings over 20 years of experience in project management, software development, and technology advisory across industries including heavy construction machinery, fintech, loan appraisals, insurance, and energy. He leads the design and development of TruePulse’s user interface, creating seamless dashboards that make creating and responding to polls effortless.',
                avatar: 'E'
              },
              {
                name: 'Adam',
                role: 'Co-founder',
                bio: 'Adam co-founded TruePulse, bringing experience from DecentraVerify and TrueYou into the project. He drives product innovation and strategy, ensuring TruePulse evolves to meet the needs of both Web3 and mainstream users.',
                avatar: 'A'
              },
              {
                name: 'Oscar',
                role: 'Backend Engineer',
                bio: 'Oscar builds and maintains the backend architecture of TruePulse. With strong skills in real-time data processing, APIs, and scalable systems, he ensures poll data is securely handled, stored, and delivered efficiently.',
                avatar: 'O'
              }
            ].map((member, index) => (
              <ScrollReveal key={member.name} delay={index * 100}>
                <Card className="text-center p-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                  <p className="text-blue-600 dark:text-blue-400 mb-3">{member.role}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{member.bio}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">True Pulse</h3>
              <p className="text-gray-400 mb-6">
                Context-aware feedback collection platform built on the Internet Computer Protocol.
                Secure, transparent, and user-owned data.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Twitter className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Github className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Linkedin className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/projects" className="hover:text-white transition-colors">Projects</a></li>
                <li><a href="/surveys" className="hover:text-white transition-colors">Surveys</a></li>
                <li><a href="/polls" className="hover:text-white transition-colors">Polls</a></li>
                <li><a href="/admin" className="hover:text-white transition-colors">Admin</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 True Pulse. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Built on Internet Computer Protocol 🚀
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
