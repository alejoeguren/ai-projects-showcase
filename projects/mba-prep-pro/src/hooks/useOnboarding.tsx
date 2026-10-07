import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep = 'school-selection' | 'resume-upload' | 'pricing' | 'completed';

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedSchools: number[];
  hasUploadedResume: boolean;
  isOnboardingComplete: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  setSelectedSchools: (schools: number[]) => void;
  setHasUploadedResume: (uploaded: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  canSkipToComplete: () => boolean;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 'school-selection',
      selectedSchools: [],
      hasUploadedResume: false,
      isOnboardingComplete: false,
      setCurrentStep: (step) => set({ currentStep: step }),
      setSelectedSchools: (schools) => set({ selectedSchools: schools }),
      setHasUploadedResume: (uploaded) => set({ hasUploadedResume: uploaded }),
      completeOnboarding: () => set({ 
        isOnboardingComplete: true, 
        currentStep: 'completed' 
      }),
      resetOnboarding: () => set({ 
        currentStep: 'school-selection',
        selectedSchools: [],
        hasUploadedResume: false,
        isOnboardingComplete: false 
      }),
      canSkipToComplete: () => {
        const state = get();
        // User can complete onboarding if they have either uploaded a resume OR selected schools
        return state.hasUploadedResume || state.selectedSchools.length > 0;
      },
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedSchools: state.selectedSchools,
        hasUploadedResume: state.hasUploadedResume,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);