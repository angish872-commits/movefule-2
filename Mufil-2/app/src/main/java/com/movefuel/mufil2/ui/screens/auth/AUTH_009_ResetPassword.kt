package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH009ResetPasswordScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_009",
        title = "Reset Password",
        subtitle = "Choose a new password for your account.",
        primaryLabel = "Save new password",
        primaryRoute = MoveFuelRoute.AUTH_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_008,
        onNavigate = onNavigate,
    ) {
        MFField("New password", "", secure = true)
        MFField("Confirm password", "", secure = true)
        MFNotice(
            title = "Password update",
            body = "After the reset is accepted, sign in again using the new password.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH009ResetPasswordScreenPreview() {
    MoveFuelTheme { AUTH009ResetPasswordScreen {} }
}
