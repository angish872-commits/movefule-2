package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS016SyncPendingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_016",
        title = "Sync Pending",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_015,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Saved locally","Queued for sync","Acknowledged"),1)
            MFNotice("Pending","The app does not pretend the server has confirmed this change yet.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS016SyncPendingScreenPreview() {
    MoveFuelTheme { SYS016SyncPendingScreen {} }
}
