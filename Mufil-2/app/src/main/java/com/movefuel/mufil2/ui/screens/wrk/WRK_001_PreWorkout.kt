package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK001PreWorkoutScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_001",
        title = "Pre Workout",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_024,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Workout prescription unavailable", "Execution is enabled only for a canonical plan reference.")
            MFMetricRow("Readiness" to "Unknown", "Exercises" to "Unknown", "Time" to "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK001PreWorkoutScreenPreview() {
    MoveFuelTheme { WRK001PreWorkoutScreen {} }
}
