package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP009CookingTimerScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_009",
        title = "Cooking Timer",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_008,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Timer" to "08:42","Step" to "2/5")
            MFStatusBanner("Timer running","The cooking step remains visible.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP009CookingTimerScreenPreview() {
    MoveFuelTheme { RCP009CookingTimerScreen {} }
}
