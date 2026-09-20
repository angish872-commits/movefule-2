package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO012PrivacyAndDataScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_012",
        title = "Privacy and Data",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_011,
        onNavigate = onNavigate,
    ) {
            MFListItem("Export my data","Prepare a portable export","Start")
            MFListItem("Connected services","Review access","Open")
            MFListItem("Delete account","Destructive action","Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO012PrivacyAndDataScreenPreview() {
    MoveFuelTheme { PRO012PrivacyAndDataScreen {} }
}
