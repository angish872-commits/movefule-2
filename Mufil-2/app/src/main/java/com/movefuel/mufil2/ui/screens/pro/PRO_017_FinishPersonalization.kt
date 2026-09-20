package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO017FinishPersonalizationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_017",
        title = "Finish Personalization",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_016,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Setup incomplete","A few optional settings remain.")
            MFListItem("Food preferences","Not finished","Continue")
            MFListItem("Train setup","Not started","Continue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO017FinishPersonalizationScreenPreview() {
    MoveFuelTheme { PRO017FinishPersonalizationScreen {} }
}
