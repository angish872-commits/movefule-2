package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH002SignInScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_002",
        title = "Sign In",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_001,
        onNavigate = onNavigate,
    ) {
            MFField("Email", "you@example.com")
            MFField("Password", "••••••••")
            MFNotice("Secure sign-in", "Your credentials are never displayed after submission.", "Forgot password")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH002SignInScreenPreview() {
    MoveFuelTheme { AUTH002SignInScreen {} }
}
