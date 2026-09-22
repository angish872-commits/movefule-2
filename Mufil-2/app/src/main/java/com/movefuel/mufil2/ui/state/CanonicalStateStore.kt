package com.movefuel.mufil2.ui.state

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Values that describe the availability of data, rather than pretending that missing data is zero. */
enum class CanonicalSyncState {
    Unknown,
    Offline,
    Pending,
    Synced,
    Failed,
}

enum class WorkoutExecutionState {
    Idle,
    InProgress,
    SummaryPending,
}

enum class FoodDraftSource {
    Search,
    Camera,
    Barcode,
    Recipe,
}

/**
 * The small, local canonical aggregate used by the connected UI.
 *
 * Nullable fields are intentional.  A missing fact is different from a zero-valued fact,
 * and planned values are never stored in the confirmed fields below.
 */
data class CanonicalAppState(
    val onboardingCompleted: Boolean = false,
    val onboardingStep: String? = null,
    val trainState: TrainState = TrainState.NotConfigured,
    val trainSetupStep: String? = null,
    val persistedSetupInputs: Set<String> = emptySet(),
    val planPreviewReference: String? = null,
    val activePlanReference: String? = null,
    val confirmedFoodCount: Int? = null,
    val lastConfirmedFood: String? = null,
    val pendingFoodSource: FoodDraftSource? = null,
    val workoutExecution: WorkoutExecutionState = WorkoutExecutionState.Idle,
    val performedSetCount: Int? = null,
    val completedWorkoutCount: Int? = null,
    val syncState: CanonicalSyncState = CanonicalSyncState.Unknown,
    val profileName: String? = null,
    val deviceName: String? = null,
    val targetDateOfBirth: String? = null,
    val targetHeight: String? = null,
    val targetWeight: String? = null,
    val targetMetricUnits: Boolean = true,
    val targetSexForEnergyEstimation: String? = null,
    val targetActivityLevel: String? = null,
    val targetTrainingFrequency: String? = null,
    val targetGoal: String? = null,
)

private val Context.canonicalStateDataStore by preferencesDataStore(
    name = "movefuel_canonical_state",
)

private val Context.legacyUiStateDataStore by preferencesDataStore(
    name = "movefuel_ui_state",
)

object CanonicalStateStore {
    private val onboardingCompletedKey = androidx.datastore.preferences.core.booleanPreferencesKey("onboarding_completed")
    private val onboardingStepKey = stringPreferencesKey("onboarding_step")
    private val trainStateKey = stringPreferencesKey("train_state")
    private val trainSetupStepKey = stringPreferencesKey("train_setup_step")
    private val setupInputsKey = stringPreferencesKey("train_setup_inputs")
    private val planPreviewReferenceKey = stringPreferencesKey("plan_preview_reference")
    private val activePlanReferenceKey = stringPreferencesKey("active_plan_reference")
    private val confirmedFoodCountKey = intPreferencesKey("confirmed_food_count")
    private val lastConfirmedFoodKey = stringPreferencesKey("last_confirmed_food")
    private val pendingFoodSourceKey = stringPreferencesKey("pending_food_source")
    private val workoutExecutionKey = stringPreferencesKey("workout_execution")
    private val performedSetCountKey = intPreferencesKey("performed_set_count")
    private val completedWorkoutCountKey = intPreferencesKey("completed_workout_count")
    private val syncStateKey = stringPreferencesKey("sync_state")
    private val profileNameKey = stringPreferencesKey("profile_name")
    private val deviceNameKey = stringPreferencesKey("device_name")
    private val targetDateOfBirthKey = stringPreferencesKey("target_date_of_birth")
    private val targetHeightKey = stringPreferencesKey("target_height")
    private val targetWeightKey = stringPreferencesKey("target_weight")
    private val targetMetricUnitsKey = androidx.datastore.preferences.core.booleanPreferencesKey("target_metric_units")
    private val targetSexKey = stringPreferencesKey("target_sex")
    private val targetActivityLevelKey = stringPreferencesKey("target_activity_level")
    private val targetTrainingFrequencyKey = stringPreferencesKey("target_training_frequency")
    private val targetGoalKey = stringPreferencesKey("target_goal")

    fun observe(context: Context): Flow<CanonicalAppState> =
        context.canonicalStateDataStore.data.map { preferences ->
            CanonicalAppState(
                onboardingCompleted = preferences[onboardingCompletedKey] ?: false,
                onboardingStep = preferences[onboardingStepKey],
                trainState = preferences[trainStateKey].toTrainState(),
                trainSetupStep = preferences[trainSetupStepKey],
                persistedSetupInputs = preferences[setupInputsKey].csvSet(),
                planPreviewReference = preferences[planPreviewReferenceKey],
                activePlanReference = preferences[activePlanReferenceKey],
                confirmedFoodCount = preferences[confirmedFoodCountKey],
                lastConfirmedFood = preferences[lastConfirmedFoodKey],
                pendingFoodSource = preferences[pendingFoodSourceKey].toFoodDraftSource(),
                workoutExecution = preferences[workoutExecutionKey].toWorkoutExecutionState(),
                performedSetCount = preferences[performedSetCountKey],
                completedWorkoutCount = preferences[completedWorkoutCountKey],
                syncState = preferences[syncStateKey].toSyncState(),
                profileName = preferences[profileNameKey],
                deviceName = preferences[deviceNameKey],
                targetDateOfBirth = preferences[targetDateOfBirthKey],
                targetHeight = preferences[targetHeightKey],
                targetWeight = preferences[targetWeightKey],
                targetMetricUnits = preferences[targetMetricUnitsKey] ?: true,
                targetSexForEnergyEstimation = preferences[targetSexKey],
                targetActivityLevel = preferences[targetActivityLevelKey],
                targetTrainingFrequency = preferences[targetTrainingFrequencyKey],
                targetGoal = preferences[targetGoalKey],
            )
        }

    /** Initializes the canonical store and migrates the old routing-only keys once. */
    suspend fun ensureInitialized(context: Context) {
        val legacy = context.legacyUiStateDataStore.data.first()
        context.canonicalStateDataStore.edit { preferences ->
            if (preferences[trainStateKey] == null) {
                preferences[trainStateKey] = legacy[legacyTrainStateKey] ?: TrainState.NotConfigured.name
            }
            if (preferences[trainSetupStepKey] == null) {
                legacy[legacySetupStepKey]?.let { preferences[trainSetupStepKey] = it }
            }
            if (preferences[syncStateKey] == null) {
                preferences[syncStateKey] = CanonicalSyncState.Unknown.name
            }
        }
    }

    suspend fun markSetupIncomplete(context: Context, stepRouteName: String) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.SetupIncomplete.name
            preferences[trainSetupStepKey] = stepRouteName
            preferences[setupInputsKey] = preferences[setupInputsKey].csvSet()
                .plus(stepRouteName)
                .sorted()
                .joinToString(",")
        }
    }

    suspend fun persistOnboardingStep(context: Context, stepRouteName: String) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[onboardingStepKey] = stepRouteName
        }
    }

    suspend fun completeOnboarding(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[onboardingCompletedKey] = true
            preferences.remove(onboardingStepKey)
        }
    }

    suspend fun markPlanPreview(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.PlanPreview.name
            preferences[trainSetupStepKey] = "TRS_020"
            // This is a reference to a pending engine result, not a fabricated workout plan.
            preferences[planPreviewReferenceKey] = "pending-engine"
        }
    }

    /** Returns false when no real plan reference exists, keeping pending/unavailable distinct from Active. */
    suspend fun activatePlan(context: Context): Boolean {
        var activated = false
        context.canonicalStateDataStore.edit { preferences ->
            val previewReference = preferences[planPreviewReferenceKey]
            if (!previewReference.isNullOrBlank() && previewReference != "pending-engine") {
                preferences[trainStateKey] = TrainState.Active.name
                preferences[activePlanReferenceKey] = previewReference
                preferences.remove(trainSetupStepKey)
                activated = true
            }
        }
        return activated
    }

    suspend fun beginFoodDraft(context: Context, source: FoodDraftSource) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[pendingFoodSourceKey] = source.name
        }
    }

    /** The only write boundary that turns a food draft into confirmed intake. */
    suspend fun confirmFood(context: Context, foodName: String?, source: FoodDraftSource) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[pendingFoodSourceKey] = source.name
            preferences[confirmedFoodCountKey] = (preferences[confirmedFoodCountKey] ?: 0) + 1
            if (foodName.isNullOrBlank()) {
                preferences.remove(lastConfirmedFoodKey)
            } else {
                preferences[lastConfirmedFoodKey] = foodName.trim()
            }
            preferences[syncStateKey] = CanonicalSyncState.Pending.name
            preferences.remove(pendingFoodSourceKey)
        }
    }

    suspend fun beginWorkout(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[workoutExecutionKey] = WorkoutExecutionState.InProgress.name
            preferences[performedSetCountKey] = 0
        }
    }

    /** Records a performed set; it never mutates prescription/plan fields. */
    suspend fun recordPerformedSet(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            if (preferences[workoutExecutionKey] == WorkoutExecutionState.InProgress.name) {
                preferences[performedSetCountKey] = (preferences[performedSetCountKey] ?: 0) + 1
            }
        }
    }

    /** Completion is committed only after the workout summary is explicitly left. */
    suspend fun commitWorkoutSummary(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            if (preferences[workoutExecutionKey] == WorkoutExecutionState.InProgress.name) {
                preferences[workoutExecutionKey] = WorkoutExecutionState.SummaryPending.name
            }
            if (preferences[workoutExecutionKey] == WorkoutExecutionState.SummaryPending.name) {
                preferences[completedWorkoutCountKey] = (preferences[completedWorkoutCountKey] ?: 0) + 1
                preferences[workoutExecutionKey] = WorkoutExecutionState.Idle.name
                preferences[syncStateKey] = CanonicalSyncState.Pending.name
            }
        }
    }

    suspend fun setProfileName(context: Context, name: String) {
        context.canonicalStateDataStore.edit { preferences ->
            if (name.isBlank()) preferences.remove(profileNameKey) else preferences[profileNameKey] = name.trim()
        }
    }

    /** Persists the target-preview inputs. Missing values stay missing; blank clears the field. */
    suspend fun setTargetInputs(context: Context, inputs: TargetInputs) {
        context.canonicalStateDataStore.edit { preferences ->
            inputs.dateOfBirth.putOrRemove(preferences, targetDateOfBirthKey)
            inputs.height.putOrRemove(preferences, targetHeightKey)
            inputs.weight.putOrRemove(preferences, targetWeightKey)
            preferences[targetMetricUnitsKey] = inputs.metricUnits
            inputs.sexForEnergyEstimation.putOrRemove(preferences, targetSexKey)
            inputs.activityLevel.putOrRemove(preferences, targetActivityLevelKey)
            inputs.trainingFrequency.putOrRemove(preferences, targetTrainingFrequencyKey)
            inputs.goal.putOrRemove(preferences, targetGoalKey)
        }
    }

    suspend fun markSyncPending(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences[syncStateKey] = CanonicalSyncState.Pending.name
        }
    }

    suspend fun reset(context: Context) {
        context.canonicalStateDataStore.edit { preferences ->
            preferences.clear()
            preferences[trainStateKey] = TrainState.NotConfigured.name
            preferences[syncStateKey] = CanonicalSyncState.Unknown.name
        }
    }

    private val legacyTrainStateKey = stringPreferencesKey("train_state")
    private val legacySetupStepKey = stringPreferencesKey("train_setup_step")
}

/** Editable target-preview inputs. Null means unknown and must not be coerced to zero. */
data class TargetInputs(
    val dateOfBirth: String? = null,
    val height: String? = null,
    val weight: String? = null,
    val metricUnits: Boolean = true,
    val sexForEnergyEstimation: String? = null,
    val activityLevel: String? = null,
    val trainingFrequency: String? = null,
    val goal: String? = null,
)

private fun String?.putOrRemove(
    preferences: androidx.datastore.preferences.core.MutablePreferences,
    key: androidx.datastore.preferences.core.Preferences.Key<String>,
) {
    val trimmed = this?.trim()
    if (trimmed.isNullOrEmpty()) preferences.remove(key) else preferences[key] = trimmed
}

private fun String?.toTrainState(): TrainState =
    this?.let { value -> TrainState.values().firstOrNull { it.name == value } }
        ?: TrainState.NotConfigured

private fun String?.toFoodDraftSource(): FoodDraftSource? =
    this?.let { value -> FoodDraftSource.values().firstOrNull { it.name == value } }

private fun String?.toWorkoutExecutionState(): WorkoutExecutionState =
    this?.let { value -> WorkoutExecutionState.values().firstOrNull { it.name == value } }
        ?: WorkoutExecutionState.Idle

private fun String?.toSyncState(): CanonicalSyncState =
    this?.let { value -> CanonicalSyncState.values().firstOrNull { it.name == value } }
        ?: CanonicalSyncState.Unknown

private fun String?.csvSet(): Set<String> =
    this.orEmpty()
        .split(",")
        .map(String::trim)
        .filter(String::isNotEmpty)
        .toSet()
