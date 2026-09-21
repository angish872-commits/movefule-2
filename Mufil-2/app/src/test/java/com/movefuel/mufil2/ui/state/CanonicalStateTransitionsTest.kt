package com.movefuel.mufil2.ui.state

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CanonicalStateTransitionsTest {
    @Test
    fun onboardingProgressSurvivesAsASeparateCanonicalFact() {
        val inProgress = CanonicalStateTransitions.onboardingStep(CanonicalAppState(), "ONB_009")

        assertEquals("ONB_009", inProgress.onboardingStep)
        assertEquals(false, inProgress.onboardingCompleted)
        assertTrue(CanonicalStateTransitions.completeOnboarding(inProgress).onboardingCompleted)
    }

    @Test
    fun onboardingAndTrainSetupPersistProgressWithoutActivating() {
        val state = CanonicalStateTransitions.setupStep(CanonicalAppState(), "TRS_002")

        assertEquals(TrainState.SetupIncomplete, state.trainState)
        assertEquals("TRS_002", state.trainSetupStep)
        assertTrue("TRS_002" in state.persistedSetupInputs)
        assertNotEquals(TrainState.Active, state.trainState)
    }

    @Test
    fun planPreviewIsNotActiveAndPendingEngineCannotActivate() {
        val preview = CanonicalStateTransitions.planPreview(CanonicalAppState())

        assertEquals(TrainState.PlanPreview, preview.trainState)
        assertNull(CanonicalStateTransitions.activatePlan(preview, preview.planPreviewReference))
    }

    @Test
    fun activationRequiresAnExplicitRealPlanReference() {
        val preview = CanonicalStateTransitions.planPreview(CanonicalAppState())
        val active = CanonicalStateTransitions.activatePlan(preview, "plan-123")

        assertEquals(TrainState.Active, active?.trainState)
        assertEquals("plan-123", active?.activePlanReference)
    }

    @Test
    fun foodDraftIsNotConfirmedUntilConfirmationBoundary() {
        val draft = CanonicalAppState(pendingFoodSource = FoodDraftSource.Camera)
        assertNull(draft.confirmedFoodCount)

        val confirmed = CanonicalStateTransitions.confirmFood(draft, FoodDraftSource.Camera)
        assertEquals(1, confirmed.confirmedFoodCount)
        assertNull(confirmed.pendingFoodSource)
        assertEquals(CanonicalSyncState.Pending, confirmed.syncState)
    }

    @Test
    fun cookedRecipeAndBarcodeProductRemainUnconfirmedUntilSharedBoundary() {
        val cooked = CanonicalAppState(pendingFoodSource = FoodDraftSource.Recipe)
        val product = CanonicalAppState(pendingFoodSource = FoodDraftSource.Barcode)

        assertNull(cooked.confirmedFoodCount)
        assertNull(product.confirmedFoodCount)
        assertEquals(1, CanonicalStateTransitions.confirmFood(cooked, FoodDraftSource.Recipe).confirmedFoodCount)
    }

    @Test
    fun prescribedWorkIsNotPerformedAndCompletionRequiresCommittedSummary() {
        val idle = CanonicalAppState()
        assertEquals(idle, CanonicalStateTransitions.performedSet(idle))
        assertEquals(idle, CanonicalStateTransitions.committedWorkoutSummary(idle))

        val inProgress = CanonicalStateTransitions.beginWorkout(idle)
        val withSet = CanonicalStateTransitions.performedSet(inProgress)
        assertEquals(1, withSet.performedSetCount)
        assertNull(withSet.completedWorkoutCount)

        val completed = CanonicalStateTransitions.committedWorkoutSummary(withSet)
        assertEquals(1, completed.completedWorkoutCount)
        assertEquals(WorkoutExecutionState.Idle, completed.workoutExecution)
    }

    @Test
    fun unknownValuesDoNotBecomeZeroes() {
        val state = CanonicalAppState()

        assertNull(state.confirmedFoodCount)
        assertNull(state.performedSetCount)
        assertNull(state.completedWorkoutCount)
        assertNotEquals(0, state.confirmedFoodCount)
    }
}
