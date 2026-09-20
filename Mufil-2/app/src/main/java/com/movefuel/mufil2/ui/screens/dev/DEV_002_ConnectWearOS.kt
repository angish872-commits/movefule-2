package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV002ConnectWearOSScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_002",
        title = "Connect Wear OS",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_001,
        onNavigate = onNavigate,
    ) {
            MFNotice("Connect Wear OS","MoveFuel verifies the app peer and account context, not Bluetooth alone.")
            MFOptionCard("Start discovery",null,true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV002ConnectWearOSScreenPreview() {
    MoveFuelTheme { DEV002ConnectWearOSScreen {} }
}
