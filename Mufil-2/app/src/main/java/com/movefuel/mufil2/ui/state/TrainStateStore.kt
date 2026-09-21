package com.movefuel.mufil2.ui.state

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class TrainState {
    NotConfigured,
    SetupIncomplete,
    PlanPreview,
    Active,
}

object TrainStateStore {
    // The canonical state is preferencesDataStore-backed; this facade preserves the audited API.
    fun observeState(context: Context): Flow<TrainState> =
        CanonicalStateStore.observe(context).let { states ->
            states.map { it.trainState }
        }

    fun observeSetupStep(context: Context): Flow<String?> =
        CanonicalStateStore.observe(context).let { states ->
            states.map { it.trainSetupStep }
        }

    suspend fun ensureInitialized(context: Context) {
        CanonicalStateStore.ensureInitialized(context)
    }

    suspend fun markSetupIncomplete(
        context: Context,
        stepRouteName: String,
    ) {
        CanonicalStateStore.markSetupIncomplete(context, stepRouteName)
    }

    suspend fun markPlanPreview(context: Context) {
        CanonicalStateStore.markPlanPreview(context)
    }

    suspend fun markActive(context: Context) {
        CanonicalStateStore.activatePlan(context)
    }

    suspend fun reset(context: Context) {
        CanonicalStateStore.reset(context)
    }
}
