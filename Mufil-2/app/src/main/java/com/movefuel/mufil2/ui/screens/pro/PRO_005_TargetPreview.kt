package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO005TargetPreviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_005",
        title = "Target Preview",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_004,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Preview future change","Historical days remain unchanged.")
            MFListItem("Current","General fitness","Until today")
            MFListItem("New","Strength focus","From tomorrow")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO005TargetPreviewScreenPreview() {
    MoveFuelTheme { PRO005TargetPreviewScreen {} }
}
