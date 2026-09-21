package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV004DeviceFoundScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_004",
        title = "Device Found",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_003,
        onNavigate = onNavigate,
    ) {
            MFListItem("Device candidate","Peer identity unavailable","Select")
            MFNotice("Verify device","Confirm this is the watch you want to connect.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV004DeviceFoundScreenPreview() {
    MoveFuelTheme { DEV004DeviceFoundScreen {} }
}
