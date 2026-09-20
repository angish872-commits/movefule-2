package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK014RestTimerScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_014",
        title = "Rest Timer",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_013,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Rest" to "01:12","Next" to "Set 3")
            MFStatusBanner("Resting","Timer remains visible and resumable.")
            MFOptionCard("+15 sec")
            MFOptionCard("Skip rest")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK014RestTimerScreenPreview() {
    MoveFuelTheme { WRK014RestTimerScreen {} }
}
