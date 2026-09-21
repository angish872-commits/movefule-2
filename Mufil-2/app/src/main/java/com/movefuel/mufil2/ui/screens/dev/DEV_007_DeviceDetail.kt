package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV007DeviceDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_007",
        title = "Device Detail",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_006,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Device status unavailable","No acknowledged connection",MoveFuelColors.TextMuted)
            MFListItem("Last sync","Unknown until sync is acknowledged","Unknown")
            MFListItem("App version","Current","")
            MFListItem("Pending events","Unknown","Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV007DeviceDetailScreenPreview() {
    MoveFuelTheme { DEV007DeviceDetailScreen {} }
}
