package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN016MissedWorkoutScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_016",
        title = "Missed Workout",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_015,
        onNavigate = onNavigate,
    ) {
            MFNotice("Missed workout","Choose whether to reschedule, continue the week, or skip.")
            MFOptionCard("Reschedule",null,true)
            MFOptionCard("Continue plan")
            MFOptionCard("Skip")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN016MissedWorkoutScreenPreview() {
    MoveFuelTheme { TRN016MissedWorkoutScreen {} }
}
