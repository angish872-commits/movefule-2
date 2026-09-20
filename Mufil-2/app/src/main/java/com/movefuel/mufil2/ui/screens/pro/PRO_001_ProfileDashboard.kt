package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO001ProfileDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_001",
        title = "Profile Dashboard",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_030,
        onNavigate = onNavigate,
    ) {
            MFListItem("Personal Details","Name · DOB · region","Open")
            MFListItem("Targets & Goals","Current future targets","Open")
            MFListItem("Units & Region","Metric · English","Open")
            MFListItem("Devices","1 connected","Open")
            MFListItem("Privacy & Data","Export · delete","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO001ProfileDashboardScreenPreview() {
    MoveFuelTheme { PRO001ProfileDashboardScreen {} }
}
