package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO002SelectedDateScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_002",
        title = "Selected Date",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_001,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFStatusBanner("Selected day", "Saturday, September 19")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO002SelectedDateScreenPreview() {
    MoveFuelTheme { FNO002SelectedDateScreen {} }
}
