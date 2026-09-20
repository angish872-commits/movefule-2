package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS006SystemSavedOfflineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_006",
        title = "System Saved Offline",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_005,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Saved on this device","Your change is pending synchronization.",MoveFuelColors.Info)
            MFListItem("Sync state","Pending","Queued")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS006SystemSavedOfflineScreenPreview() {
    MoveFuelTheme { SYS006SystemSavedOfflineScreen {} }
}
