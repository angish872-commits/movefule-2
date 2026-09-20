package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV010StaleDeviceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_010",
        title = "Stale Device",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("Device data is stale","The watch is paired, but MoveFuel has not received a recent acknowledgment.","Reconnect")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV010StaleDeviceScreenPreview() {
    MoveFuelTheme { DEV010StaleDeviceScreen {} }
}
