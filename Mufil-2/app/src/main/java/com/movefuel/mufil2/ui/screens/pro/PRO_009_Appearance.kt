package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO009AppearanceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_009",
        title = "Appearance",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_008,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("System")
            MFOptionCard("Dark",null,true)
            MFOptionCard("Light")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO009AppearanceScreenPreview() {
    MoveFuelTheme { PRO009AppearanceScreen {} }
}
