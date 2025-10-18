'use client'

import { useState, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WizardStep {
  title: string
  description: string
  icon?: ReactNode
}

interface PollCreationWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onComplete: () => void
  onCancel: () => void
  children: ReactNode
  canProceed?: boolean
  isSubmitting?: boolean
}

export function PollCreationWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  children,
  canProceed = true,
  isSubmitting = false,
}: PollCreationWizardProps) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      onStepChange(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Create New Poll</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isAccessible = index <= currentStep

            return (
              <button
                key={index}
                onClick={() => isAccessible && onStepChange(index)}
                disabled={!isAccessible}
                className={cn(
                  'flex flex-col items-center space-y-2 flex-1 transition-all',
                  isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    isActive &&
                      'border-blue-600 bg-blue-600 text-white scale-110',
                    isCompleted &&
                      'border-green-600 bg-green-600 text-white',
                    !isActive && !isCompleted &&
                      'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="text-center max-w-[120px]">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {step.title}
                  </div>
                  {isActive && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[500px]">
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pb-20 lg:pb-0">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating...
            </>
          ) : isLastStep ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Create Poll
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
