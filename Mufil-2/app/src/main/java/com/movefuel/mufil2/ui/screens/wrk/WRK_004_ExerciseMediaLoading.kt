package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK004ExerciseMediaLoadingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_004",
        title = "Exercise Media Loading",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_003,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Exercise media is buffering.",true)
            MFNotice("Workout still active","Media loading never blocks set logging.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK004ExerciseMediaLoadingScreenPreview() {
    MoveFuelTheme { WRK004ExerciseMediaLoadingScreen {} }
}
