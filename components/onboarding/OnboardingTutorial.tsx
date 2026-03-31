'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getStepDefs, getTotalSteps } from '@/components/onboarding/onboarding-steps';
import {
  avancarOnboarding,
  voltarOnboarding,
  pularTutorialCompleto,
  completarOnboarding,
} from '@/app/(dashboard)/onboarding/actions';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { OnboardingBar } from '@/components/onboarding/OnboardingBar';

interface OnboardingTutorialProps {
  role: 'dono' | 'motorista';
  currentStep: number;
}

/**
 * Main onboarding orchestrator. Rendered in the dashboard layout when
 * the tutorial is active (not completed, not a test account unless redo=true).
 *
 * Responsibilities:
 * - Shows overlay for welcome/conclusion steps
 * - Shows floating bar for all steps
 * - Uses driver.js to highlight elements on the current page
 * - Navigates between pages when user advances/goes back
 * - Persists progress via server actions
 */
export function OnboardingTutorial({ role, currentStep }: OnboardingTutorialProps) {
  const router = useRouter();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const stepDefs = getStepDefs(role);
  const totalSteps = getTotalSteps(role);
  const currentDef = stepDefs[currentStep];

  // Whether this is an overlay step (welcome or conclusion)
  const isOverlay = currentDef?.overlay === true;
  const isWelcome = currentStep === 0;
  const isLastContentStep = currentStep === totalSteps - 2;

  // Check if the current page matches the expected page for this step
  const isOnCorrectPage = currentDef
    ? pathname === currentDef.page || pathname.startsWith(currentDef.page + '/')
    : false;

  // Cleanup driver on unmount or step change
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [currentStep, pathname]);

  // Start driver.js highlights when on the correct page and not an overlay step
  useEffect(() => {
    if (isOverlay || !isOnCorrectPage || !currentDef) return;

    const highlights = currentDef.highlights;
    if (highlights.length === 0) return;

    // Delay to ensure page elements are rendered
    const timer = setTimeout(() => {
      // Destroy previous driver instance if any
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }

      const driverObj = driver({
        showProgress: false,
        showButtons: ['next', 'close'],
        doneBtnText: 'Entendi',
        nextBtnText: 'Entendi',
        animate: true,
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 10,
        stageRadius: 8,
        popoverOffset: 15,
        popoverClass: 'frotaviva-onboarding',
        steps: highlights,
        onDestroyStarted: () => {
          driverObj.destroy();
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 700);

    return () => {
      clearTimeout(timer);
    };
  }, [currentStep, pathname, isOverlay, isOnCorrectPage, currentDef]);

  // Handler: advance to next step
  const handleNext = useCallback(async () => {
    // Destroy driver highlights before navigating
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    const nextStep = currentStep + 1;

    if (nextStep >= totalSteps) {
      // All steps done
      await completarOnboarding();
      router.refresh();
      return;
    }

    await avancarOnboarding();

    const nextDef = stepDefs[nextStep];
    if (nextDef) {
      if (nextDef.page !== pathname) {
        router.push(nextDef.page);
        setTimeout(() => router.refresh(), 200);
      } else {
        router.refresh();
      }
    }
  }, [currentStep, totalSteps, stepDefs, pathname, router]);

  // Handler: go back to previous step
  const handleBack = useCallback(async () => {
    if (currentStep <= 0) return;

    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    await voltarOnboarding();

    const prevDef = stepDefs[currentStep - 1];
    if (prevDef) {
      if (prevDef.overlay) {
        // Going back to welcome overlay — just refresh
        router.refresh();
      } else if (prevDef.page !== pathname) {
        router.push(prevDef.page);
        setTimeout(() => router.refresh(), 200);
      } else {
        router.refresh();
      }
    }
  }, [currentStep, stepDefs, pathname, router]);

  // Handler: skip entire tutorial
  const handleSkip = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    await pularTutorialCompleto();
    router.refresh();
  }, [router]);

  // Handler: welcome overlay "Comecar"
  const handleWelcomeContinue = useCallback(async () => {
    await avancarOnboarding();
    const nextDef = stepDefs[1];
    if (nextDef) {
      router.push(nextDef.page);
    } else {
      router.refresh();
    }
  }, [stepDefs, router]);

  // Handler: conclusion overlay "Comecar a Usar"
  const handleConclusionContinue = useCallback(async () => {
    await completarOnboarding();
    router.refresh();
  }, [router]);

  if (!currentDef) return null;

  // Overlay steps (welcome/conclusion)
  if (isOverlay) {
    return (
      <OnboardingOverlay
        type={isWelcome ? 'welcome' : 'conclusion'}
        role={role}
        onContinue={isWelcome ? handleWelcomeContinue : handleConclusionContinue}
        onSkip={handleSkip}
      />
    );
  }

  // Content steps: show bar + "Continuar Tutorial" banner if on wrong page
  return (
    <>
      {/* Banner removido — barra do topo já contém toda a informação necessária */}

      {/* Floating bottom bar */}
      <OnboardingBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepTitle={currentDef.title}
        stepDescription={currentDef.description}
        disableBack={currentStep <= 1}
        isLastContentStep={isLastContentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
      />

      {/* Bottom padding so page content isn't hidden behind the bar */}
      <div className="h-32" />
    </>
  );
}
