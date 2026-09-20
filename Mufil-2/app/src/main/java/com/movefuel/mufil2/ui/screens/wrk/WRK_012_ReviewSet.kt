package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK012ReviewSetScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_012",
        title = "Review Set",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_011,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Reps" to "8","Load" to "60kg","RPE" to "7")
            MFNotice("Ready to complete","These values become performed facts only after confirmation.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK012ReviewSetScreenPreview() {
    MoveFuelTheme { WRK012ReviewSetScreen {} }
}
