package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK020SubstituteExerciseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_020",
        title = "Substitute Exercise",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_021,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_019,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Dumbbell press","Same movement pattern",true)
            MFOptionCard("Machine chest press","Available equipment")
            MFOptionCard("Push-up","Bodyweight")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK020SubstituteExerciseScreenPreview() {
    MoveFuelTheme { WRK020SubstituteExerciseScreen {} }
}
