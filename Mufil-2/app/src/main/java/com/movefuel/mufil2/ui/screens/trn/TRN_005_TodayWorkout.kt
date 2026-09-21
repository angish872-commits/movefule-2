package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN005TodayWorkoutScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_005",
        title = "Today Workout",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_004,
        onNavigate = onNavigate,
    ) {
            MFNotice("Workout prescription unavailable", "Today’s workout appears only when a canonical plan reference is available.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN005TodayWorkoutScreenPreview() {
    MoveFuelTheme { TRN005TodayWorkoutScreen {} }
}
