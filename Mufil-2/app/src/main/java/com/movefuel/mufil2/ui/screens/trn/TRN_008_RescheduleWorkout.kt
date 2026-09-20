package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN008RescheduleWorkoutScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_008",
        title = "Reschedule Workout",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_007,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFField("Time","17:30")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN008RescheduleWorkoutScreenPreview() {
    MoveFuelTheme { TRN008RescheduleWorkoutScreen {} }
}
