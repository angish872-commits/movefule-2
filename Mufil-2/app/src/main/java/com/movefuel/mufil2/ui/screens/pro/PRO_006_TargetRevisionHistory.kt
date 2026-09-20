package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO006TargetRevisionHistoryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_006",
        title = "Target Revision History",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_005,
        onNavigate = onNavigate,
    ) {
            MFListItem("Current revision","Strength focus","Active")
            MFListItem("Previous revision","General fitness","View")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO006TargetRevisionHistoryScreenPreview() {
    MoveFuelTheme { PRO006TargetRevisionHistoryScreen {} }
}
