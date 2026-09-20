package com.movefuel.mufil2.ui.screens.dev

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun DEV008DevicePermissionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "DEV_008",
        title = "Device Permissions",
        subtitle = "Device connection and synchronization.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.DEV_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.DEV_007,
        onNavigate = onNavigate,
    ) {
            MFToggleRow("Workout data","Allow workout execution sync.",true)
            MFToggleRow("Activity data","Allow supported activity sync.",true)
            MFToggleRow("Notifications","Allow workout prompts.",true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun DEV008DevicePermissionsScreenPreview() {
    MoveFuelTheme { DEV008DevicePermissionsScreen {} }
}
