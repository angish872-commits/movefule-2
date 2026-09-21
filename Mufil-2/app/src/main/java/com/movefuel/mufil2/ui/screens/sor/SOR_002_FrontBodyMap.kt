package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR002FrontBodyMapScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_002",
        title = "Front Body Map",
        subtitle = "Tap a region to record soreness. Pain uses the separate safety route.",
        primaryLabel = "Show back",
        primaryRoute = MoveFuelRoute.SOR_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_001,
        onNavigate = onNavigate,
    ) {
        MFBodyMapPlaceholder(
            front = true,
            onRegionTap = { onNavigate(MoveFuelRoute.SOR_004) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun SOR002FrontBodyMapScreenPreview() {
    MoveFuelTheme { SOR002FrontBodyMapScreen {} }
}
