package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK003ActiveExerciseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_003",
        title = "Active Exercise",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_002,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Set 2 of 4 · target 8 reps")
            MFMetricRow("Set" to "2/4","Target" to "8","Load" to "60kg")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK003ActiveExerciseScreenPreview() {
    MoveFuelTheme { WRK003ActiveExerciseScreen {} }
}
