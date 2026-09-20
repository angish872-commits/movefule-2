package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO017FuelEmptyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_017",
        title = "Fuel Empty",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_016,
        onNavigate = onNavigate,
    ) {
            MFNotice(title = "Fuel Empty", body = "Confirmed intake is not fabricated when data is unavailable.", action = "Add food")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO017FuelEmptyScreenPreview() {
    MoveFuelTheme { FNO017FuelEmptyScreen {} }
}
