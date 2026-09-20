package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO003TargetsAndGoalsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_003",
        title = "Targets and Goals",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_002,
        onNavigate = onNavigate,
    ) {
            MFListItem("Primary goal","General fitness","Edit")
            MFListItem("Future target","No restrictive target","Edit")
            MFNotice("Historical integrity","Target changes affect future recommendations only.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO003TargetsAndGoalsScreenPreview() {
    MoveFuelTheme { PRO003TargetsAndGoalsScreen {} }
}
