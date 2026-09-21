package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV001DevicesDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_001",
        title = "Devices",
        subtitle = "Connection, permissions, freshness, and synchronization.",
        primaryLabel = "Connect a device",
        primaryRoute = MoveFuelRoute.DEV_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_001,
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            "Pixel Watch",
            "Connected · synced recently",
            MoveFuelColors.Success,
            onClick = { onNavigate(MoveFuelRoute.DEV_007) },
        )
        MFListItem(
            "Last sync",
            "A few moments ago · fresh",
            onClick = { onNavigate(MoveFuelRoute.DEV_009) },
        )
        MFListItem(
            "Permissions",
            "Workout · activity",
            onClick = { onNavigate(MoveFuelRoute.DEV_008) },
        )
        MFListItem(
            "Device details",
            "Connection, freshness and disconnect controls",
            onClick = { onNavigate(MoveFuelRoute.DEV_007) },
        )
        MFNotice(
            title = "Sync authority",
            body = "Watch-recorded workout facts remain pending until the phone/backend acknowledges them.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun DEV001DevicesDashboardScreenPreview() {
    MoveFuelTheme { DEV001DevicesDashboardScreen {} }
}
