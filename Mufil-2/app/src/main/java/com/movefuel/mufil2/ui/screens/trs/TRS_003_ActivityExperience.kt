package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS003ActivityExperienceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_003",
        title = "Activity Experience",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_002,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Beginner")
            MFOptionCard("Intermediate",null,true)
            MFOptionCard("Advanced")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS003ActivityExperienceScreenPreview() {
    MoveFuelTheme { TRS003ActivityExperienceScreen {} }
}
