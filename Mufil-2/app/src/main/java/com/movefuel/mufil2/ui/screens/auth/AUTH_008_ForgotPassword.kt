package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH008ForgotPasswordScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_008",
        title = "Forgot Password",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_007,
        onNavigate = onNavigate,
    ) {
            MFField("New password", "••••••••")
            MFField("Confirm password", "••••••••")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH008ForgotPasswordScreenPreview() {
    MoveFuelTheme { AUTH008ForgotPasswordScreen {} }
}
