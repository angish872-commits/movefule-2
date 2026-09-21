package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO001ProfileDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_001",
        title = "Profile",
        subtitle = "Account, preferences, future targets, devices, privacy, and help.",
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.MASTER_TODAY,
        onNavigate = onNavigate,
    ) {
        MFSectionTitle("You")
        MFListItem(
            "Personal details",
            "Name · date of birth · region",
            onClick = { onNavigate(MoveFuelRoute.PRO_002) },
        )
        MFListItem(
            "Targets & goals",
            "Future recommendations only; history remains unchanged",
            onClick = { onNavigate(MoveFuelRoute.PRO_003) },
        )

        MFSectionTitle("Preferences")
        MFListItem("Units", "Metric", onClick = { onNavigate(MoveFuelRoute.PRO_007) })
        MFListItem("Language & region", "English", onClick = { onNavigate(MoveFuelRoute.PRO_008) })
        MFListItem("Appearance", "MoveFuel dark", onClick = { onNavigate(MoveFuelRoute.PRO_009) })
        MFListItem("Sound & haptics", "Review feedback settings", onClick = { onNavigate(MoveFuelRoute.PRO_010) })
        MFListItem("Notifications", "Training · meals · sync", onClick = { onNavigate(MoveFuelRoute.PRO_011) })

        MFSectionTitle("Connections & account")
        MFListItem("Devices", "1 connected", onClick = { onNavigate(MoveFuelRoute.DEV_001) })
        MFListItem("Privacy & data", "Export · account controls", onClick = { onNavigate(MoveFuelRoute.PRO_012) })
        MFListItem("Terms & privacy", "Policies", onClick = { onNavigate(MoveFuelRoute.PRO_015) })
        MFListItem("Help center", "Support and troubleshooting", onClick = { onNavigate(MoveFuelRoute.PRO_016) })
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun PRO001ProfileDashboardScreenPreview() {
    MoveFuelTheme { PRO001ProfileDashboardScreen {} }
}
