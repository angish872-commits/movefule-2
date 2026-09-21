package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN006WorkoutDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_006",
        title = "Workout Detail",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_005,
        onNavigate = onNavigate,
    ) {
            MFNotice("Workout detail unavailable", "Prescription details are not fabricated while the canonical engine is unavailable.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN006WorkoutDetailScreenPreview() {
    MoveFuelTheme { TRN006WorkoutDetailScreen {} }
}
