package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK028ResumeWorkoutScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_028",
        title = "Resume Workout",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_029,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_027,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Workout paused","Current exercise and set state are preserved.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK028ResumeWorkoutScreenPreview() {
    MoveFuelTheme { WRK028ResumeWorkoutScreen {} }
}
