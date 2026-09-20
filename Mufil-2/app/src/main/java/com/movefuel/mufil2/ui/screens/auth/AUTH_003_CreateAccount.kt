package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH003CreateAccountScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_003",
        title = "Create Account",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_002,
        onNavigate = onNavigate,
    ) {
            MFField("Display name", "Your name")
            MFField("Email", "you@example.com")
            MFField("Password", "Create a strong password")
            MFToggleRow("Terms and Privacy", "Required before account creation.", true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH003CreateAccountScreenPreview() {
    MoveFuelTheme { AUTH003CreateAccountScreen {} }
}
