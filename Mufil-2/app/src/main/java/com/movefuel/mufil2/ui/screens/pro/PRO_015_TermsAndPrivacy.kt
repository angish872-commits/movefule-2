package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO015TermsAndPrivacyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_015",
        title = "Terms and Privacy",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_016,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_014,
        onNavigate = onNavigate,
    ) {
            MFListItem("Terms of Service","Current version","Open")
            MFListItem("Privacy Policy","Current version","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO015TermsAndPrivacyScreenPreview() {
    MoveFuelTheme { PRO015TermsAndPrivacyScreen {} }
}
