package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV011ReconnectDeviceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_011",
        title = "Reconnect Device",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_010,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Finding paired watch","Verifying peer","Restoring session"),1)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV011ReconnectDeviceScreenPreview() {
    MoveFuelTheme { DEV011ReconnectDeviceScreen {} }
}
