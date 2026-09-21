package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.*
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH003CreateAccountScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    var acceptedTerms by remember { mutableStateOf(false) }

    MFScreenFrame(
        id = "AUTH_003",
        title = "Create Account",
        subtitle = "Create a secure MoveFuel account.",
        primaryLabel = "Create account",
        primaryRoute = MoveFuelRoute.AUTH_004,
        secondaryLabel = "Sign in",
        secondaryRoute = MoveFuelRoute.AUTH_002,
        primaryEnabled = acceptedTerms,
        onNavigate = onNavigate,
    ) {
        MFField("Display name", "")
        MFField("Email", "")
        MFField("Password", "", secure = true)
        MFToggleRow(
            title = "Terms and Privacy",
            supporting = "Required before account creation.",
            checked = acceptedTerms,
            onCheckedChange = { acceptedTerms = it },
        )
        MFNotice(
            title = if (acceptedTerms) "Ready to create account" else "Review required",
            body = if (acceptedTerms) {
                "You can continue to email verification."
            } else {
                "Review and accept the Terms and Privacy information before continuing."
            },
            action = "Open Terms & Privacy",
            onAction = { onNavigate(MoveFuelRoute.PRO_015) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH003CreateAccountScreenPreview() {
    MoveFuelTheme { AUTH003CreateAccountScreen {} }
}
