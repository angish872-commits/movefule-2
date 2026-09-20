package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB001WelcomeScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_001",
        title = "Welcome",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_012,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Set up MoveFuel", "Nutrition, training, preferences, and safety context.")
            MFOptionCard("Set up now", "Recommended for personalized Today, Fuel, and Train.", true)
            MFOptionCard("Finish later", "Enter with limited personalization.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB001WelcomeScreenPreview() {
    MoveFuelTheme { ONB001WelcomeScreen {} }
}
