package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK019NextExerciseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_019",
        title = "Next Exercise",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_020,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_018,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Set complete","Progress saved locally.",MoveFuelColors.Success)
            MFListItem("Next exercise","Seated row · 3 × 10","Continue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK019NextExerciseScreenPreview() {
    MoveFuelTheme { WRK019NextExerciseScreen {} }
}
