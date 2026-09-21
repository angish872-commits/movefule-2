package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH002SignInScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_002",
        title = "Sign In",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Sign in",
        primaryRoute = MoveFuelRoute.MASTER_TODAY,
        secondaryLabel = "Create account",
        secondaryRoute = MoveFuelRoute.AUTH_003,
        onNavigate = onNavigate,
    ) {
        MFField("Email", "")
        MFField("Password", "", secure = true)
        MFNotice(
            title = "Secure sign-in",
            body = "Credentials are submitted securely and are not shown after sign-in.",
            action = "Forgot password?",
            onAction = { onNavigate(MoveFuelRoute.AUTH_008) },
        )
        MFNotice(
            title = "Session routing",
            body = "A completed account opens Today. An incomplete account will resume setup once session state is connected.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH002SignInScreenPreview() {
    MoveFuelTheme { AUTH002SignInScreen {} }
}
