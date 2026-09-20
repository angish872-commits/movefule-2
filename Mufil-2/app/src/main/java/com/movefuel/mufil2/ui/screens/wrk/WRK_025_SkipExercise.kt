package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK025SkipExerciseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_025",
        title = "Skip Exercise",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_026,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_024,
        onNavigate = onNavigate,
    ) {
            MFNotice("Skip this item?","The workout records that it was skipped instead of pretending it was completed.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK025SkipExerciseScreenPreview() {
    MoveFuelTheme { WRK025SkipExerciseScreen {} }
}
