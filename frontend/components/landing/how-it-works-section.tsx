"use client"

import { ScrollReveal } from './scroll-reveal'

export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'Create Your Poll',
      description: 'Enter your question and customize your poll options. Choose from multiple question types and design templates.',
      bgColor: 'bg-blue-600',
    },
    {
      number: 2,
      title: 'Deploy on Blockchain',
      description: 'Your poll is automatically deployed on the blockchain, creating an immutable and transparent voting system.',
      bgColor: 'bg-purple-600',
    },
    {
      number: 3,
      title: 'Share & Collect',
      description: 'Share your poll link and watch real-time results come in. All votes are verified and counted transparently.',
      bgColor: 'bg-green-600',
    },
  ]

  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create and deploy your poll in minutes with our simple three-step process
          </p>
        </ScrollReveal>

        <div className="relative">
          {/* Connection Lines - Desktop Only */}
          <div className="hidden md:block absolute top-[30px] left-0 right-0 mx-auto" style={{ width: '70%', left: '15%' }}>
            <div className="h-0.5 bg-gray-300 dark:bg-gray-700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, index) => (
              <ScrollReveal key={step.number} delay={index * 100}>
                <div className="text-center">
                  {/* Number Circle */}
                  <div className={`w-[60px] h-[60px] ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <span className="text-white text-2xl font-bold">{step.number}</span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {step.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
