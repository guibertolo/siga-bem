'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Onboarding state persisted in user_metadata.
 * Tracks tutorial progress across sessions.
 */
export interface OnboardingState {
  /** Current step index (0 = welcome overlay) */
  step: number;
  /** True when user completed all steps or skipped entirely */
  completed: boolean;
  /** True when user clicked "Refazer Tutorial" */
  redo: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  step: 0,
  completed: false,
  redo: false,
};

/**
 * Reads the current onboarding state from user_metadata.
 * Returns default state if no metadata exists yet.
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ...DEFAULT_STATE, completed: true };
  }

  const meta = user.user_metadata ?? {};

  return {
    step: typeof meta.onboarding_step === 'number' ? meta.onboarding_step : 0,
    completed: meta.onboarding_completed === true,
    redo: meta.onboarding_redo === true,
  };
}

/**
 * Advances to the next onboarding step (step++).
 */
export async function avancarOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const currentStep =
    typeof user.user_metadata?.onboarding_step === 'number'
      ? user.user_metadata.onboarding_step
      : 0;

  await supabase.auth.updateUser({
    data: { onboarding_step: currentStep + 1 },
  });
}

/**
 * Goes back to the previous onboarding step (step--).
 * Does nothing if already at step 0.
 */
export async function voltarOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const currentStep =
    typeof user.user_metadata?.onboarding_step === 'number'
      ? user.user_metadata.onboarding_step
      : 0;

  if (currentStep > 0) {
    await supabase.auth.updateUser({
      data: { onboarding_step: currentStep - 1 },
    });
  }
}

/**
 * Skips the entire tutorial. Sets completed = true.
 * Called when user clicks "Pular Tutorial Completo".
 */
export async function pularTutorialCompleto(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({
    data: {
      onboarding_completed: true,
      onboarding_redo: false,
    },
  });
}

/**
 * Marks onboarding as completed after the user finishes all steps.
 */
export async function completarOnboarding(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({
    data: {
      onboarding_completed: true,
      onboarding_redo: false,
      onboarding_step: 0,
    },
  });
}

/**
 * Resets onboarding so the tutorial plays again.
 * Called from "Refazer Tutorial" in user profile.
 */
export async function resetarOnboarding(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({
    data: {
      onboarding_completed: false,
      onboarding_redo: true,
      onboarding_step: 0,
    },
  });
}
