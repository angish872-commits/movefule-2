package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV001DevicesDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_001",
        title = "Devices Dashboard",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_018,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Pixel Watch","Connected · synced recently",MoveFuelColors.Success)
            MFListItem("Last sync","A few moments ago","Fresh")
            MFListItem("Permissions","Workout · activity","Review")
            MFListItem("Health connections","1 source","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV001DevicesDashboardScreenPreview() {
    MoveFuelTheme { DEV001DevicesDashboardScreen {} }
}
