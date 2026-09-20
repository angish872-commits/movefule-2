package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV012DisconnectDeviceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_012",
        title = "Disconnect Device",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_011,
        onNavigate = onNavigate,
    ) {
            MFNotice("Disconnect device?","Resolve pending workout events before removing MoveFuel access.")
            MFListItem("Pending events","0","Safe to disconnect")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV012DisconnectDeviceScreenPreview() {
    MoveFuelTheme { DEV012DisconnectDeviceScreen {} }
}
