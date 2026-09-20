package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO018FuelOfflineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_018",
        title = "Fuel Offline",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FPL_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_017,
        onNavigate = onNavigate,
    ) {
            MFNotice(title = "Fuel Offline", body = "Confirmed intake is not fabricated when data is unavailable.", action = "Add food")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO018FuelOfflineScreenPreview() {
    MoveFuelTheme { FNO018FuelOfflineScreen {} }
}
