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
)

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
