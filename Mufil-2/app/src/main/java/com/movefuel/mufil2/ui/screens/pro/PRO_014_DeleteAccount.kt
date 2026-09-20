package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO014DeleteAccountScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_014",
        title = "Delete Account",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_013,
        onNavigate = onNavigate,
    ) {
            MFNotice("Delete account?","This is destructive and requires explicit confirmation. It is never hidden behind a normal save action.")
            MFField("Type DELETE to confirm","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO014DeleteAccountScreenPreview() {
    MoveFuelTheme { PRO014DeleteAccountScreen {} }
}
