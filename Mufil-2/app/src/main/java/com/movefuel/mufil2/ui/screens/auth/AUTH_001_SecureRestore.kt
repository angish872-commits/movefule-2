package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH001SecureRestoreScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_001",
        title = "Secure Restore",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.MASTER_PROGRESS,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Restoring MoveFuel", "Checking secure session and saved setup.")
            MFStageList(listOf("Local session","Account check","Onboarding status"), 1)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH001SecureRestoreScreenPreview() {
    MoveFuelTheme { AUTH001SecureRestoreScreen {} }
}
