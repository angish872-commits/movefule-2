package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV009ManualSyncScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_009",
        title = "Manual Sync",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_008,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Preparing sync","Sending local events","Waiting for acknowledgment","Complete"),1)
            MFNotice("Idempotent sync","Retrying does not duplicate completed workout events.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV009ManualSyncScreenPreview() {
    MoveFuelTheme { DEV009ManualSyncScreen {} }
}
