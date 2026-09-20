package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB002SetupChoiceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_002",
        title = "Setup Choice",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_001,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Set up now", "Complete the guided setup.", true)
            MFOptionCard("Finish later", "Continue with setup reminders.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB002SetupChoiceScreenPreview() {
    MoveFuelTheme { ONB002SetupChoiceScreen {} }
}
