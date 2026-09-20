package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV006ConnectedDeviceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_006",
        title = "Connected Device",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_005,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Pixel Watch","Connected",MoveFuelColors.Success)
            MFListItem("Last sync","A few moments ago","Fresh")
            MFListItem("App version","Current","")
            MFListItem("Pending events","0","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV006ConnectedDeviceScreenPreview() {
    MoveFuelTheme { DEV006ConnectedDeviceScreen {} }
}
