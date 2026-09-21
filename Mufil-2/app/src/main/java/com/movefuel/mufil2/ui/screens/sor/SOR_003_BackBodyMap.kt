package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR003BackBodyMapScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_003",
        title = "Back Body Map",
        subtitle = "Tap a region to record soreness. Pain uses the separate safety route.",
        primaryLabel = "Show front",
        primaryRoute = MoveFuelRoute.SOR_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_001,
        onNavigate = onNavigate,
    ) {
        MFBodyMapPlaceholder(
            front = false,
            onRegionTap = { onNavigate(MoveFuelRoute.SOR_004) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun SOR003BackBodyMapScreenPreview() {
    MoveFuelTheme { SOR003BackBodyMapScreen {} }
}
