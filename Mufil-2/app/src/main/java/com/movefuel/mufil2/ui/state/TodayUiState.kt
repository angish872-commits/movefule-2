package com.movefuel.mufil2.ui.state

import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

data class TodayMetricUi(
    val label: String,
    val value: String?,
    val target: String?,
    val progress: Float?,
)

data class TodayNextActionUi(
    val title: String,
    val supporting: String,
    val route: MoveFuelRoute,
)

data class TodayUiState(
    val greeting: String,
    val subtitle: String,
    val energy: TodayMetricUi,
    val protein: TodayMetricUi,
    val movement: TodayMetricUi,
    val fiberValue: String?,
    val dataFreshness: String,
    val nextAction: TodayNextActionUi?,
    val deviceName: String?,
    val deviceDetail: String?,
    val confirmedFoodCount: Int? = null,
    val lastConfirmedFood: String? = null,
)

fun CanonicalAppState.toTodayUiState(): TodayUiState {
    val nextAction = when (trainState) {
        TrainState.NotConfigured -> TodayNextActionUi(
            title = "Set up Train when ready",
            supporting = "No workout is counted until a plan is explicitly activated and performed.",
            route = MoveFuelRoute.MASTER_TRAIN,
        )
        TrainState.SetupIncomplete -> TodayNextActionUi(
            title = "Continue Train setup",
            supporting = "Your setup step is persisted and can resume after restart.",
            route = MoveFuelRoute.MASTER_TRAIN,
        )
        TrainState.PlanPreview -> TodayNextActionUi(
            title = "Review pending training plan",
            supporting = "Plan generation is unavailable until the canonical engine returns a plan.",
            route = MoveFuelRoute.TRS_020,
        )
        TrainState.Active -> null
    }
    return TodayUiState(
        greeting = profileName?.takeIf(String::isNotBlank)?.let { "Hello, $it" } ?: "Today",
        subtitle = "Canonical facts · ${if (syncState == CanonicalSyncState.Unknown) "data availability unknown" else syncState.name.lowercase()}",
        energy = TodayMetricUi("Energy", null, null, null),
        protein = TodayMetricUi("Protein", null, null, null),
        movement = TodayMetricUi("Movement", null, null, null),
        fiberValue = null,
        dataFreshness = when (syncState) {
            CanonicalSyncState.Synced -> "Synced"
            CanonicalSyncState.Pending -> "Sync pending"
            CanonicalSyncState.Offline -> "Offline"
            CanonicalSyncState.Failed -> "Sync failed"
            CanonicalSyncState.Unknown -> "Unavailable"
        },
        nextAction = nextAction,
        deviceName = deviceName,
        deviceDetail = if (deviceName == null) null else "Device identity is connected; measurements are unavailable until synced.",
        confirmedFoodCount = confirmedFoodCount,
        lastConfirmedFood = lastConfirmedFood,
    )
}

fun previewTodayUiState() = TodayUiState(
    greeting = "Good evening",
    subtitle = "Saturday · September 19",
    energy = TodayMetricUi("Energy", "1,742 kcal", "2,180 kcal", .80f),
    protein = TodayMetricUi("Protein", "116 g", "145 g", .80f),
    movement = TodayMetricUi("Movement", "38 min", "60 min", .63f),
    fiberValue = "24 g",
    dataFreshness = "Recent",
    nextAction = TodayNextActionUi(
        title = "Review your planned lunch",
        supporting = "Tap to continue directly into the unfinished task.",
        route = MoveFuelRoute.FPL_017,
    ),
    deviceName = "Pixel Watch",
    deviceDetail = "Synced recently · workout ready",
)
