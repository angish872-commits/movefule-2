package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH006VerificationSuccessScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_006",
        title = "Verification Success",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_005,
        onNavigate = onNavigate,
    ) {
            MFNotice("Verification Success", "Your local data remains safe while this account state is resolved.", "Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH006VerificationSuccessScreenPreview() {
    MoveFuelTheme { AUTH006VerificationSuccessScreen {} }
}
