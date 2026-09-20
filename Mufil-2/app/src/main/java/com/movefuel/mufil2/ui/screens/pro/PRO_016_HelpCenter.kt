package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO016HelpCenterScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_016",
        title = "Help Center",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_015,
        onNavigate = onNavigate,
    ) {
            MFField("Search help","")
            MFListItem("Account","Sign-in and verification","Open")
            MFListItem("Food logging","Camera and barcode","Open")
            MFListItem("Training","Readiness and workouts","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO016HelpCenterScreenPreview() {
    MoveFuelTheme { PRO016HelpCenterScreen {} }
}
