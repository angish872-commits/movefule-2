package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV003DeviceDiscoveryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_003",
        title = "Device Discovery",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_002,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Searching nearby","Checking MoveFuel app","Verifying account","Ready"),0)
            MFListItem("Searching…","Nearby Wear OS devices","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV003DeviceDiscoveryScreenPreview() {
    MoveFuelTheme { DEV003DeviceDiscoveryScreen {} }
}
