package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK002WorkoutStartScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_002",
        title = "Workout Start",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_001,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Upper Strength A","46 min · 5 exercises")
            MFMetricRow("Readiness" to "Reduced","Exercises" to "5","Time" to "46m")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK002WorkoutStartScreenPreview() {
    MoveFuelTheme { WRK002WorkoutStartScreen {} }
}
