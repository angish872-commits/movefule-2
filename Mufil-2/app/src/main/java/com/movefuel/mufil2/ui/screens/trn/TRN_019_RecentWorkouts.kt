package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN019RecentWorkoutsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_019",
        title = "Recent Workouts",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_020,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_018,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Upper Strength A","46 min · 5 exercises")
            MFListItem("Bench press","4 × 8","1")
            MFListItem("Seated row","3 × 10","2")
            MFListItem("Shoulder press","3 × 10","3")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN019RecentWorkoutsScreenPreview() {
    MoveFuelTheme { TRN019RecentWorkoutsScreen {} }
}
