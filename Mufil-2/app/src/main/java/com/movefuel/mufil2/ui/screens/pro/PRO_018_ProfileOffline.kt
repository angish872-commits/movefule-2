package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO018ProfileOfflineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_018",
        title = "Profile Offline",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_017,
        onNavigate = onNavigate,
    ) {
            MFNotice("Profile offline","Cached settings remain visible; edits are marked pending until sync succeeds.","Retry sync")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO018ProfileOfflineScreenPreview() {
    MoveFuelTheme { PRO018ProfileOfflineScreen {} }
}
