package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG020WorkoutConsistencyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_020",
        title = "Workout Consistency",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_021,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_019,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Workout Consistency", subtitle = "Performed workout facts only")
            MFMetricRow("Latest" to "42","Change" to "+8%","Coverage" to "94%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG020WorkoutConsistencyScreenPreview() {
    MoveFuelTheme { PRG020WorkoutConsistencyScreen {} }
}
