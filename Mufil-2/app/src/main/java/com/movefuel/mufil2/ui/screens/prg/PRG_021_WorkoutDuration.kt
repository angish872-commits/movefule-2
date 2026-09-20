package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG021WorkoutDurationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_021",
        title = "Workout Duration",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_022,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_020,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Workout Duration", subtitle = "Performed workout facts only")
            MFMetricRow("Latest" to "42","Change" to "+8%","Coverage" to "94%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG021WorkoutDurationScreenPreview() {
    MoveFuelTheme { PRG021WorkoutDurationScreen {} }
}
