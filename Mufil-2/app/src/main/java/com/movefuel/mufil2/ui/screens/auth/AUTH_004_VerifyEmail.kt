package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH004VerifyEmailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_004",
        title = "Verify Email",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_003,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Check your email", "Verification is required before onboarding continues.")
            MFField("Email", "you@example.com")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH004VerifyEmailScreenPreview() {
    MoveFuelTheme { AUTH004VerifyEmailScreen {} }
}
