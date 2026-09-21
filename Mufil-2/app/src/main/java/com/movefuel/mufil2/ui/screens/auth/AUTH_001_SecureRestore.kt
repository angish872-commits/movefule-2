package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH001SecureRestoreScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_001",
        title = "MoveFuel",
        subtitle = "Restoring your secure session and setup status.",
        primaryLabel = "Sign in",
        primaryRoute = MoveFuelRoute.AUTH_002,
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            "Secure restore",
            "MoveFuel checks local session state, account state, and onboarding progress before choosing the correct destination.",
        )
        MFStageList(
            listOf("Local session", "Account check", "Setup status"),
            activeIndex = 1,
        )
        MFNotice(
            title = "Routing contract",
            body = "Returning completed accounts open Today. Incomplete accounts resume setup. New accounts continue to onboarding after verification.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH001SecureRestoreScreenPreview() {
    MoveFuelTheme { AUTH001SecureRestoreScreen {} }
}
