"use client"

import { Shield, Lock, Zap } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

export function WhyChooseSection() {
  const benefits = [
    {
      icon: Shield,
      title: 'Tamper-Proof Results',
      description: 'Every vote is recorded on the blockchain, ensuring complete transparency and preventing any manipulation of results.',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Lock,
      title: 'Anonymous & Private',
      description: 'Protect respondent privacy with zero-knowledge proofs while maintaining vote authenticity and preventing duplicates.',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Get real-time analytics and results as votes come in, with automatic verification and transparent counting.',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-600 dark:text-green-400',
    },
  ]

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose True Pulse?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience the future of polling with blockchain-powered transparency and security
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <ScrollReveal key={benefit.title} delay={index * 100}>
              <div className="text-center">
                {/* Icon Box */}
                <div className={`w-20 h-20 ${benefit.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <benefit.icon className={`w-10 h-10 ${benefit.textColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {benefit.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
