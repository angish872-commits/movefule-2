package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD005TodayWorkoutPreviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_005",
        title = "Today Workout Preview",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_004,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Upper Strength A", "46 min · 5 exercises")
            MFMetricRow("Readiness" to "Reduced", "Exercises" to "5", "Time" to "46m")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD005TodayWorkoutPreviewScreenPreview() {
    MoveFuelTheme { TOD005TodayWorkoutPreviewScreen {} }
}
