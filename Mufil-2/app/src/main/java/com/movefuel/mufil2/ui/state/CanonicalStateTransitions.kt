package com.movefuel.mufil2.ui.state

/** Pure domain transitions used by persistence and unit tests. */
object CanonicalStateTransitions {
    fun onboardingStep(state: CanonicalAppState, stepRouteName: String): CanonicalAppState =
        state.copy(onboardingStep = stepRouteName)

    fun completeOnboarding(state: CanonicalAppState): CanonicalAppState =
        state.copy(onboardingCompleted = true, onboardingStep = null)

    fun setupStep(state: CanonicalAppState, stepRouteName: String): CanonicalAppState =
        state.copy(
            trainState = TrainState.SetupIncomplete,
            trainSetupStep = stepRouteName,
            persistedSetupInputs = state.persistedSetupInputs + stepRouteName,
        )

    fun planPreview(state: CanonicalAppState): CanonicalAppState =
        state.copy(
            trainState = TrainState.PlanPreview,
            trainSetupStep = "TRS_020",
            planPreviewReference = "pending-engine",
            activePlanReference = null,
        )

    fun activatePlan(state: CanonicalAppState, planReference: String?): CanonicalAppState? =
        planReference
            ?.takeIf { it.isNotBlank() && it != "pending-engine" }
            ?.let {
                state.copy(
                    trainState = TrainState.Active,
                    trainSetupStep = null,
                    activePlanReference = it,
                )
            }

    fun confirmFood(state: CanonicalAppState, source: FoodDraftSource): CanonicalAppState =
        state.copy(
            confirmedFoodCount = (state.confirmedFoodCount ?: 0) + 1,
            pendingFoodSource = null,
            syncState = CanonicalSyncState.Pending,
        )

    fun beginWorkout(state: CanonicalAppState): CanonicalAppState =
        state.copy(workoutExecution = WorkoutExecutionState.InProgress, performedSetCount = 0)

    fun performedSet(state: CanonicalAppState): CanonicalAppState =
        if (state.workoutExecution == WorkoutExecutionState.InProgress) {
            state.copy(performedSetCount = (state.performedSetCount ?: 0) + 1)
        } else {
            state
        }

    fun committedWorkoutSummary(state: CanonicalAppState): CanonicalAppState =
        if (state.workoutExecution == WorkoutExecutionState.InProgress ||
            state.workoutExecution == WorkoutExecutionState.SummaryPending
        ) {
            state.copy(
                workoutExecution = WorkoutExecutionState.Idle,
                completedWorkoutCount = (state.completedWorkoutCount ?: 0) + 1,
                syncState = CanonicalSyncState.Pending,
            )
        } else {
            state
        }
}
