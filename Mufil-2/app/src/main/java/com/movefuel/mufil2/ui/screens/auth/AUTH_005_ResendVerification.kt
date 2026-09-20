package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH005ResendVerificationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_005",
        title = "Resend Verification",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_004,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Check your email", "Verification is required before onboarding continues.")
            MFField("Email", "you@example.com")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH005ResendVerificationScreenPreview() {
    MoveFuelTheme { AUTH005ResendVerificationScreen {} }
}
