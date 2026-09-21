package com.movefuel.mufil2.ui.state

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Small persisted UI-routing state for the progressive Train entry flow.
 *
 * This is intentionally separate from the future canonical TrainingPlan entity.
 * The UI may only move to [TrainState.Active] after the activation action has
 * successfully persisted its current plan-selection state.
 */
enum class TrainState {
    NotConfigured,
    SetupIncomplete,
    PlanPreview,
    Active,
}

private val Context.moveFuelUiStateDataStore by preferencesDataStore(
    name = "movefuel_ui_state",
)

object TrainStateStore {
    private val trainStateKey = stringPreferencesKey("train_state")
    private val trainSetupStepKey = stringPreferencesKey("train_setup_step")

    fun observeState(context: Context): Flow<TrainState> =
        context.moveFuelUiStateDataStore.data.map { preferences ->
            preferences[trainStateKey]
                ?.let { stored -> TrainState.values().firstOrNull { it.name == stored } }
                ?: TrainState.NotConfigured
        }

    fun observeSetupStep(context: Context): Flow<String?> =
        context.moveFuelUiStateDataStore.data.map { preferences ->
            preferences[trainSetupStepKey]
        }

    suspend fun ensureInitialized(context: Context) {
        context.moveFuelUiStateDataStore.edit { preferences ->
            if (preferences[trainStateKey] == null) {
                preferences[trainStateKey] = TrainState.NotConfigured.name
            }
        }
    }

    suspend fun markSetupIncomplete(
        context: Context,
        stepRouteName: String,
    ) {
        context.moveFuelUiStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.SetupIncomplete.name
            preferences[trainSetupStepKey] = stepRouteName
        }
    }

    suspend fun markPlanPreview(context: Context) {
        context.moveFuelUiStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.PlanPreview.name
            preferences[trainSetupStepKey] = "TRS_020"
        }
    }

    suspend fun markActive(context: Context) {
        context.moveFuelUiStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.Active.name
            preferences.remove(trainSetupStepKey)
        }
    }

    suspend fun reset(context: Context) {
        context.moveFuelUiStateDataStore.edit { preferences ->
            preferences[trainStateKey] = TrainState.NotConfigured.name
            preferences.remove(trainSetupStepKey)
        }
    }
}
